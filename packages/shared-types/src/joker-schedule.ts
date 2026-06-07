/** Official 24-hand structure for Джокер (4 pools × deals). */
export const JOKER_TOTAL_HANDS = 24;

export const JOKER_RECOMMENDED_PLAYERS = 4;

export type MatchMode = 'HOLDEM' | 'JOKER';

/** Minimum seated players before the first hand is dealt. */
export const minPlayersToStart = (mode: MatchMode): number =>
  mode === 'JOKER' ? JOKER_RECOMMENDED_PLAYERS : 2;

/** Players required in matchmaking before a human JOKER table opens. */
export const matchmakingPlayerTarget = (mode: MatchMode): number =>
  mode === 'JOKER' ? JOKER_RECOMMENDED_PLAYERS : 2;

/** Clamp bot-table size; JOKER is always 4 per club rules. */
export const clampMatchPlayerCount = (mode: MatchMode, n?: number): number => {
  if (mode === 'JOKER') return JOKER_RECOMMENDED_PLAYERS;
  return Math.min(6, Math.max(2, n ?? 2));
};

/** Club private tables: JOKER is always 4 seats per official rules. */
export const clubTableMaxPlayers = (mode: MatchMode, requested?: number): number => {
  if (mode === 'JOKER') return JOKER_RECOMMENDED_PLAYERS;
  return Math.min(9, Math.max(2, requested ?? 6));
};

/** Cards dealt to each player for hand index 0..23. */
export const jokerCardsPerHand = (handIndex: number): number => {
  const i = ((handIndex % JOKER_TOTAL_HANDS) + JOKER_TOTAL_HANDS) % JOKER_TOTAL_HANDS;
  if (i < 8) return i + 1; // pool 1: 1..8
  if (i < 12) return 9; // pool 2: four deals × 9
  if (i < 20) return 20 - i; // pool 3: 8..1
  return 9; // pool 4: four deals × 9
};

export const jokerPoolLabel = (handIndex: number): 1 | 2 | 3 | 4 => {
  const i = ((handIndex % JOKER_TOTAL_HANDS) + JOKER_TOTAL_HANDS) % JOKER_TOTAL_HANDS;
  if (i < 8) return 1;
  if (i < 12) return 2;
  if (i < 20) return 3;
  return 4;
};
