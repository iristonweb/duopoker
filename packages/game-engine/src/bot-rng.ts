import type { SessionState } from '@duopoker/shared-types/index';
import { SeededRng } from './rng';

const STREET_SALT: Partial<Record<SessionState['street'], number>> = {
  PREFLOP: 11,
  FLOP: 22,
  TURN: 33,
  RIVER: 44,
  TRUMP_CHOICE: 51,
  BIDDING: 52,
  TRICKS: 53
};

const userIdSalt = (userId: string): number =>
  userId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

/** Deterministic per-decision RNG: session entropy + hand + street + action index + bot id. */
export const botDecisionRng = (state: SessionState, userId: string, extra = 0): SeededRng => {
  const actions = state.actionLog?.length ?? 0;
  const street = STREET_SALT[state.street] ?? 0;
  const mixed =
    (state.seed ^
      (state.handNumber + 1) * 0x9e3779b9 ^
      userIdSalt(userId) ^
      actions * 0x85ebca6b ^
      street ^
      extra) >>>
    0;
  return new SeededRng(mixed);
};

/** @deprecated alias used by Joker table */
export const botRng = (state: SessionState, userId: string): SeededRng =>
  botDecisionRng(state, userId);
