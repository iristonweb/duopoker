import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { isAutomatedPlayer, pickBotAction } from './bot-actions';
import { autoFoldActivePlayer } from './holdem-table';
import { jokerTimeoutAction, pickBotJokerAction } from './joker-table';
import { buildAutoNextHand, shouldAutoStartNextHand, shouldForceActionTimeout } from './session-tick';

export type ProcessActionResult =
  | { rejected: true; reason: string }
  | { rejected: false; state: SessionState; replay?: unknown };

const BOT_ACTION_CAP = 96;

/** Shared bot turn loop for API and socket backend game-session services. */
export const advanceBotTurnsRuntime = async (
  getState: () => Promise<SessionState | null>,
  processAction: (action: PlayerAction) => Promise<ProcessActionResult>
): Promise<SessionState | null> => {
  let last: SessionState | null = null;
  for (let i = 0; i < BOT_ACTION_CAP; i += 1) {
    const state = await getState();
    if (!state) break;
    const activeId = state.players[state.activePlayerIndex];
    if (!activeId || !isAutomatedPlayer(activeId)) break;
    if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') break;

    const primary =
      state.mode === 'JOKER' ? pickBotJokerAction(state, activeId) : pickBotAction(state, activeId);
    let r = await processAction(primary);
    if (r.rejected && state.mode === 'JOKER') {
      r = await processAction(jokerTimeoutAction(state, activeId));
    }
    if (r.rejected) {
      r = await processAction({ ...primary, type: 'call', at: Date.now() });
    }
    if (r.rejected) {
      r = await processAction({ ...primary, type: 'fold', at: Date.now() });
    }
    if (r.rejected) break;
    last = r.state;
  }
  return last;
};

export const autoStartNextHandRuntime = async (
  getState: () => Promise<SessionState | null>,
  persist: (state: SessionState) => Promise<SessionState> | SessionState
): Promise<SessionState | null> => {
  const state = await getState();
  if (!state || !shouldAutoStartNextHand(state)) return state;
  return persist(buildAutoNextHand(state));
};

export const enforceActionTimeoutRuntime = async (
  getState: () => Promise<SessionState | null>,
  foldActive: (sessionId: string, userId: string) => Promise<SessionState | null>
): Promise<SessionState | null> => {
  const state = await getState();
  if (!state || !shouldForceActionTimeout(state)) return null;
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId) return null;
  return foldActive(state.sessionId, activeId);
};

export const foldActivePlayerRuntime = async (
  getState: () => Promise<SessionState | null>,
  persist: (state: SessionState) => Promise<SessionState> | SessionState,
  sessionId: string,
  userId: string,
  advanceBots: () => Promise<SessionState | null>,
  autoNext: () => Promise<SessionState | null>
): Promise<SessionState | null> => {
  const state = await getState();
  if (!state) return null;
  const activeId = state.players[state.activePlayerIndex];
  if (activeId !== userId) return null;
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return null;
  }
  const result = autoFoldActivePlayer(state, userId);
  if (!result.ok) return null;
  await persist(result.state);
  const botState = await advanceBots();
  const after = botState ?? (await persist(result.state));
  return (await autoNext()) ?? after;
};

export const tickSessionRuntime = async (
  getState: () => Promise<SessionState | null>,
  deps: {
    enforceActionTimeout: () => Promise<SessionState | null>;
    advanceBotTurns: () => Promise<SessionState | null>;
    autoStartNextHand: () => Promise<SessionState | null>;
  }
): Promise<SessionState | null> => {
  let state = await getState();
  if (!state) return null;

  const timedOut = await deps.enforceActionTimeout();
  if (timedOut) state = timedOut;

  let botState = await deps.advanceBotTurns();
  if (botState) state = botState;

  const nextHand = await deps.autoStartNextHand();
  if (nextHand && nextHand.street !== 'COMPLETE') state = nextHand;

  botState = await deps.advanceBotTurns();
  if (botState) state = botState;

  return state;
};
