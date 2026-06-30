/** Ring index of the hero seat (bottom-center on 6-max). */
export function heroSeatIndex(total: number): number {
  if (total <= 1) return 0;
  if (total === 2) return 1;
  if (total === 4) return 3;
  return 3;
}

/** Array index to rotate hero into for clockwise opponent order. */
export function heroArrayIndex(total: number): number {
  return Math.min(heroSeatIndex(total), total - 1);
}

const opponentRingIndices = (total: number): number[] => {
  if (total <= 1) return [];
  if (total === 2) return [0];
  if (total === 3) return [0, 1];
  if (total === 4) return [0, 1, 2];
  if (total === 5) return [0, 1, 2, 4];
  return [0, 1, 2, 4, 5];
};

/**
 * Map player array index → felt ring index.
 * Hero always maps to the bottom seat even if rotation failed.
 */
export function resolveSeatLayoutIndex(
  arrayIndex: number,
  players: readonly { isHero?: boolean }[]
): number {
  const total = players.length;
  if (total === 0) return 0;

  const heroRing = heroSeatIndex(total);
  if (players[arrayIndex]?.isHero) return heroRing;

  const heroArrayIdx = players.findIndex((p) => p.isHero);
  if (heroArrayIdx < 0) {
    if (arrayIndex === total - 1) return heroRing;
    return arrayIndex;
  }

  const ringSlots = opponentRingIndices(total);
  let opponentOrder = 0;
  for (let i = 0; i < arrayIndex; i++) {
    if (!players[i]?.isHero) opponentOrder++;
  }
  return ringSlots[opponentOrder] ?? arrayIndex;
}

export function isHeroSeatIndex(index: number, total: number): boolean {
  return index === heroSeatIndex(total);
}
