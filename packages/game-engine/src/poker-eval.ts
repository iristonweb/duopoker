import type { Card, Rank } from '@duopoker/shared-types/index';

const RANK_INDEX: Record<Rank, number> = {
  '2': 0,
  '3': 1,
  '4': 2,
  '5': 3,
  '6': 4,
  '7': 5,
  '8': 6,
  '9': 7,
  T: 8,
  J: 9,
  Q: 10,
  K: 11,
  A: 12
};

export const parseCard = (c: Card): { rank: number; suit: number } => ({
  rank: RANK_INDEX[c[0] as Rank],
  suit: 'SDHC'.indexOf(c[1])
});

/** Lexicographic tuple: higher wins. SF(8) … high card(0). */
export type HandStrength = readonly number[];

const RANK_NAMES: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

const indexToRank = (i: number): Rank => RANK_NAMES[i] ?? '2';

const combinations5From7 = (seven: Card[]): Card[][] => {
  const out: Card[][] = [];
  for (let a = 0; a < 7; a += 1) {
    for (let b = a + 1; b < 7; b += 1) {
      for (let c = b + 1; c < 7; c += 1) {
        for (let d = c + 1; d < 7; d += 1) {
          for (let e = d + 1; e < 7; e += 1) {
            out.push([seven[a], seven[b], seven[c], seven[d], seven[e]]);
          }
        }
      }
    }
  }
  return out;
};

const isStraight = (sortedRanksDesc: number[]): boolean => {
  if (sortedRanksDesc.length !== 5) return false;
  const uniq = [...new Set(sortedRanksDesc)].sort((x, y) => y - x);
  if (uniq.length !== 5) return false;
  // wheel A-2-3-4-5
  const s = [...sortedRanksDesc].sort((a, b) => b - a);
  if (s[0] === 12 && s[1] === 3 && s[2] === 2 && s[3] === 1 && s[4] === 0) return true;
  for (let i = 0; i < 4; i += 1) {
    if (s[i] - s[i + 1] !== 1) return false;
  }
  return true;
};

/** Strength for exactly 5 cards (high card … straight flush). */
export const strengthFiveCards = (cards: Card[]): HandStrength => {
  const parsed = cards.map(parseCard);
  const ranks = parsed.map((p) => p.rank).sort((a, b) => b - a);
  const suits = parsed.map((p) => p.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const freq = new Map<number, number>();
  ranks.forEach((r) => freq.set(r, (freq.get(r) ?? 0) + 1));

  const byCount = [...freq.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const straightHigh = (): number => {
    const s = [...ranks].sort((a, b) => b - a);
    if (s[0] === 12 && s[1] === 3 && s[2] === 2 && s[3] === 1 && s[4] === 0) return 3; // wheel high card '5'
    return s[0];
  };

  const sf =
    isFlush && isStraight(ranks)
      ? ([8, straightHigh()] as const)
      : null;
  if (sf) return sf;

  if (byCount[0][1] === 4) {
    const quad = byCount[0][0];
    const kicker = byCount[1][0];
    return [7, quad, kicker];
  }
  if (byCount[0][1] === 3 && byCount[1][1] === 2) {
    return [6, byCount[0][0], byCount[1][0]];
  }
  if (isFlush) {
    return [5, ...ranks];
  }
  if (isStraight(ranks)) {
    return [4, straightHigh()];
  }
  if (byCount[0][1] === 3) {
    const trip = byCount[0][0];
    const kickers = [byCount[1][0], byCount[2][0]].sort((a, b) => b - a);
    return [3, trip, ...kickers];
  }
  if (byCount[0][1] === 2 && byCount[1][1] === 2) {
    const hi =
      byCount[0][0] > byCount[1][0] ? byCount[0][0] : byCount[1][0];
    const lo =
      byCount[0][0] > byCount[1][0] ? byCount[1][0] : byCount[0][0];
    const kicker = byCount[2][0];
    return [2, hi, lo, kicker];
  }
  if (byCount[0][1] === 2) {
    const pair = byCount[0][0];
    const ks = [byCount[1][0], byCount[2][0], byCount[3][0]].sort((a, b) => b - a);
    return [1, pair, ...ks];
  }
  return [0, ...ranks];
};

export const compareStrength = (a: HandStrength, b: HandStrength): number => {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const da = a[i] ?? 0;
    const db = b[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
};

export const bestStrengthFromSeven = (hole: Card[], board: Card[]): HandStrength => {
  const seven = [...hole, ...board];
  if (seven.length < 5) {
    throw new Error('Need at least 5 cards total to evaluate Hold’em hand');
  }
  let best: HandStrength = strengthFiveCards(combinations5From7(seven)[0]!);
  for (const combo of combinations5From7(seven)) {
    const s = strengthFiveCards(combo);
    if (compareStrength(s, best) > 0) best = s;
  }
  return best;
};

export const winnerAmongPlayers = (
  players: string[],
  hole: Record<string, Card[]>,
  board: Card[],
  folded: Set<string>
): string | undefined => {
  let bestP: string | undefined;
  let bestS: HandStrength | undefined;
  for (const pid of players) {
    if (folded.has(pid)) continue;
    const h = hole[pid];
    if (!h || h.length < 2) continue;
    const s = bestStrengthFromSeven(h, board);
    if (!bestS || compareStrength(s, bestS) > 0) {
      bestS = s;
      bestP = pid;
    }
  }
  return bestP;
};

export const strengthFiveFromHand = (five: Card[]): HandStrength => strengthFiveCards(five);

export const describeStrength = (s: HandStrength): string => {
  const cat = s[0];
  const labels = [
    'High card',
    'Pair',
    'Two pair',
    'Three of a kind',
    'Straight',
    'Flush',
    'Full house',
    'Four of a kind',
    'Straight flush'
  ] as const;
  const name = labels[cat] ?? 'Unknown';
  if (cat === 4 || cat === 8) {
    const high = s[1] !== undefined ? indexToRank(s[1]) : '';
    return `${name} (${high}-high)`;
  }
  return name;
};
