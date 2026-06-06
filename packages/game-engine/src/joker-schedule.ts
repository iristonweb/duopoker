/** Official 24-hand structure for Джокер (4 pools × deals). */
export const JOKER_TOTAL_HANDS = 24;

export const JOKER_RECOMMENDED_PLAYERS = 4;

/** Cards dealt to each player for hand index 0..23. */
export const jokerCardsPerHand = (handIndex: number): number => {
  const i = ((handIndex % JOKER_TOTAL_HANDS) + JOKER_TOTAL_HANDS) % JOKER_TOTAL_HANDS;
  if (i < 8) return i + 1;
  if (i < 12) return 9;
  if (i < 20) return 20 - i;
  return 9;
};

export const jokerPoolLabel = (handIndex: number): 1 | 2 | 3 | 4 => {
  const i = ((handIndex % JOKER_TOTAL_HANDS) + JOKER_TOTAL_HANDS) % JOKER_TOTAL_HANDS;
  if (i < 8) return 1;
  if (i < 12) return 2;
  if (i < 20) return 3;
  return 4;
};
