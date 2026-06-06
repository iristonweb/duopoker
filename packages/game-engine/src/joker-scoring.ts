/** Scoring table from classic Joker rules (positive variant). */
export const jokerPointsForHand = (
  bid: number,
  tricksTaken: number,
  cardsDealt: number
): number => {
  if (bid > 0 && tricksTaken === 0) {
    return -(cardsDealt * 100);
  }
  if (bid === 0) {
    return tricksTaken === 0 ? 50 : -200;
  }
  if (tricksTaken !== bid) {
    const miss = Math.abs(tricksTaken - bid);
    return -miss * 100;
  }

  const base: Record<number, number> = {
    1: 100,
    2: 150,
    3: 200,
    4: 250,
    5: 300,
    6: 350,
    7: 400,
    8: 450,
    9: 900
  };
  const bonus: Record<number, number> = {
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    6: 600,
    7: 700,
    8: 800
  };
  if (cardsDealt >= bid && bonus[bid] !== undefined) {
    return bonus[bid]!;
  }
  return base[bid] ?? bid * 100;
};
