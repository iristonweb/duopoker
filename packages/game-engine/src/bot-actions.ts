import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';

export const BOT_USER_PREFIX = 'duopoker-bot';

export const isAutomatedPlayer = (userId: string): boolean => userId.startsWith(BOT_USER_PREFIX);

export const maxRoundBet = (state: SessionState): number =>
  state.players.reduce((m, p) => Math.max(m, state.playerRoundBet[p] ?? 0), 0);

export const amountToCall = (state: SessionState, userId: string): number =>
  Math.max(0, maxRoundBet(state) - (state.playerRoundBet[userId] ?? 0));

/** Conservative bot action: check when free, otherwise call. */
export const pickBotAction = (state: SessionState, userId: string): PlayerAction => {
  const at = Date.now();
  const need = amountToCall(state, userId);
  if (need === 0) {
    return { sessionId: state.sessionId, userId, type: 'check', at };
  }
  return { sessionId: state.sessionId, userId, type: 'call', at };
};
