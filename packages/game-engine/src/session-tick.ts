import type { SessionState } from '@duopoker/shared-types/index';
import { isAutomatedPlayer } from './bot-actions';
import { startNewHand } from './holdem-table';

export const ACTION_TIMEOUT_MS = 60_000;
export const NEXT_HAND_DELAY_MS = 2800;

export const playersWithChips = (state: SessionState): string[] =>
  state.players.filter((p) => (state.stacks[p] ?? 0) > 0);

/** Attach turn deadline / hand-complete timestamps for server-side timers. */
export const enrichSessionMeta = (state: SessionState, now = Date.now()): SessionState => {
  if (state.street === 'COMPLETE') {
    return {
      ...state,
      actionDeadlineAt: undefined,
      handCompletedAt: state.handCompletedAt ?? now
    };
  }
  if (state.street === 'LOBBY' || state.street === 'SHOWDOWN') {
    return { ...state, actionDeadlineAt: undefined, handCompletedAt: undefined };
  }
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId || isAutomatedPlayer(activeId)) {
    return { ...state, actionDeadlineAt: undefined };
  }
  return { ...state, actionDeadlineAt: now + ACTION_TIMEOUT_MS, handCompletedAt: undefined };
};

export const shouldForceActionTimeout = (state: SessionState, now = Date.now()): boolean => {
  if (!state.actionDeadlineAt || now < state.actionDeadlineAt) return false;
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return false;
  }
  const activeId = state.players[state.activePlayerIndex];
  return Boolean(activeId && !isAutomatedPlayer(activeId));
};

export const shouldAutoStartNextHand = (state: SessionState, now = Date.now()): boolean => {
  if (state.street !== 'COMPLETE') return false;
  const completedAt = state.handCompletedAt ?? 0;
  if (now - completedAt < NEXT_HAND_DELAY_MS) return false;
  return playersWithChips(state).length >= 2;
};

export const buildAutoNextHand = (state: SessionState): SessionState => {
  const seated = playersWithChips(state);
  const stacks = Object.fromEntries(seated.map((p) => [p, state.stacks[p] ?? 0]));
  return startNewHand({
    ...state,
    players: seated,
    stacks,
    readyForNextHand: [],
    handCompletedAt: undefined,
    winners: undefined,
    winnersShare: undefined
  });
};
