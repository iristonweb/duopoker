import type { SessionState } from '@duopoker/shared-types/index';
import { isAutomatedPlayer } from './bot-actions';
import { resetToLobbyAfterGame, startNewHand } from './holdem-table';

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
  const active = playersWithChips(state);
  if (active.length < 2) {
    return resetToLobbyAfterGame(state);
  }

  const spectators = state.players.filter((p) => !active.includes(p));
  const hand = startNewHand({
    ...state,
    players: active,
    stacks: Object.fromEntries(active.map((p) => [p, state.stacks[p] ?? 0])),
    readyForNextHand: [],
    handCompletedAt: undefined,
    winners: undefined,
    winnersShare: undefined
  });

  if (hand.street !== 'PREFLOP') {
    return resetToLobbyAfterGame(state);
  }

  if (spectators.length === 0) {
    return hand;
  }

  return {
    ...hand,
    players: [...hand.players, ...spectators]
  };
};
