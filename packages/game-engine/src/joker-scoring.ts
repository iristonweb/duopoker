import type { JokerDealRecord, JokerScoringMode } from '@duopoker/shared-types/index';

/** Minus scoring: bid N pays N×100 on exact hit; each missed trick is −100. */
export const jokerPointsForHandMinus = (
  bid: number,
  tricksTaken: number,
  cardsDealt: number
): number => {
  if (bid === 0) {
    return tricksTaken === 0 ? 50 : -200;
  }
  if (bid > 0 && tricksTaken === 0) {
    return -(cardsDealt * 100);
  }
  if (tricksTaken === bid) {
    return bid * 100;
  }
  return -Math.abs(tricksTaken - bid) * 100;
};

/** Scoring table from classic Joker rules (positive variant). */
export const jokerPointsForHand = (
  bid: number,
  tricksTaken: number,
  cardsDealt: number,
  scoringMode: JokerScoringMode = 'classic'
): number => {
  if (scoringMode === 'minus') {
    return jokerPointsForHandMinus(bid, tricksTaken, cardsDealt);
  }
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
  // Club rules: elevated points only when the deal size matches the bid
  // (e.g. bid 2 = 150, or 200 only «в раздаче по две карты»).
  if (cardsDealt === bid && bonus[bid] !== undefined) {
    return bonus[bid]!;
  }
  return base[bid] ?? bid * 100;
};

/** Hand indices that end each pool (0-based matchHandIndex). */
export const POOL_END_HAND_INDICES: Record<1 | 2 | 3 | 4, number> = {
  1: 7,
  2: 11,
  3: 19,
  4: 23
};

const maxDealPointsInPool = (playerId: string, deals: JokerDealRecord[]): number =>
  deals.reduce((max, d) => Math.max(max, Math.max(0, d.handPoints[playerId] ?? 0)), 0);

/** Pool-end premiums per club rules. */
export const applyPoolPremiums = (
  pool: 1 | 2 | 3 | 4,
  dealHistory: JokerDealRecord[],
  players: string[],
  scores: Record<string, number>
): { scores: Record<string, number>; premiums: Record<string, number> } => {
  const poolDeals = dealHistory.filter((d) => d.pool === pool);
  if (poolDeals.length === 0) {
    return { scores, premiums: {} };
  }

  const premiumPlayers = players.filter((p) =>
    poolDeals.every((d) => (d.bids[p] ?? 0) === (d.tricksWon[p] ?? 0))
  );

  const premiums: Record<string, number> = {};
  const nextScores = { ...scores };

  if (premiumPlayers.length === 1) {
    const winner = premiumPlayers[0]!;
    const bonus = maxDealPointsInPool(winner, poolDeals);
    premiums[winner] = bonus;
    nextScores[winner] = (nextScores[winner] ?? 0) + bonus;
    for (const p of players) {
      if (p === winner) continue;
      const penalty = maxDealPointsInPool(p, poolDeals);
      if (penalty > 0) {
        premiums[p] = -penalty;
        nextScores[p] = (nextScores[p] ?? 0) - penalty;
      }
    }
  } else if (premiumPlayers.length >= 2) {
    for (const p of premiumPlayers) {
      const bonus = maxDealPointsInPool(p, poolDeals);
      premiums[p] = bonus;
      nextScores[p] = (nextScores[p] ?? 0) + bonus;
    }
  }

  return { scores: nextScores, premiums };
};

export const isPoolEndHand = (matchHandIndex: number): 1 | 2 | 3 | 4 | null => {
  for (const pool of [1, 2, 3, 4] as const) {
    if (POOL_END_HAND_INDICES[pool] === matchHandIndex) return pool;
  }
  return null;
};
