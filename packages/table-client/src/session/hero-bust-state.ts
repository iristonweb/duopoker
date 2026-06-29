export type HeroBustInput = {
  isJoker: boolean;
  userId: string;
  sessionPlayers: string[];
  heroStack: number;
  sessionStreet: string;
  viewStreet?: string;
  foldedPlayerIds?: string[];
  bustedDismissed: boolean;
  reduceMotion: boolean;
  playersWithStackCount: number;
};

export type HeroBustState = {
  heroOutOfChips: boolean;
  handSettled: boolean;
  heroFolded: boolean;
  showAllInRunoutBanner: boolean;
  showBustedOverlay: boolean;
  heroSpectating: boolean;
};

export function computeHeroBustState(input: HeroBustInput): HeroBustState {
  const {
    isJoker,
    userId,
    sessionPlayers,
    heroStack,
    sessionStreet,
    viewStreet,
    foldedPlayerIds = [],
    bustedDismissed,
    reduceMotion,
    playersWithStackCount
  } = input;

  const heroOutOfChips =
    !isJoker && sessionPlayers.includes(userId) && heroStack <= 0;
  const handSettled =
    sessionStreet === 'COMPLETE' &&
    (viewStreet === 'COMPLETE' || reduceMotion);
  const heroFolded = foldedPlayerIds.includes(userId);

  const showAllInRunoutBanner =
    heroOutOfChips &&
    !handSettled &&
    !heroFolded &&
    sessionStreet !== 'COMPLETE';

  const showBustedOverlay =
    heroOutOfChips &&
    handSettled &&
    !heroFolded &&
    !bustedDismissed &&
    heroStack <= 0;

  const heroSpectating = heroOutOfChips && playersWithStackCount >= 2;

  return {
    heroOutOfChips,
    handSettled,
    heroFolded,
    showAllInRunoutBanner,
    showBustedOverlay,
    heroSpectating
  };
}
