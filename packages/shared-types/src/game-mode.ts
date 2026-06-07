export type GameMode = 'HOLDEM' | 'JOKER';

export type LegacyGameMode = GameMode | 'RASPISNOY';

/** Normalize persisted / legacy mode strings to engine modes. */
export const normalizeGameMode = (mode: LegacyGameMode): GameMode =>
  mode === 'RASPISNOY' ? 'JOKER' : mode;
