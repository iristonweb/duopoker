import type { Card, GameMode } from '@duopoker/shared-types/index';
import {
  bestStrengthFromSeven,
  compareStrength,
  parseCard,
  strengthFiveFromHand,
  type HandStrength
} from './poker-eval';

export interface SidePot {
  amount: number;
  eligible: string[];
}

export const computeSidePots = (
  players: string[],
  handContributions: Record<string, number>,
  folded: Set<string>
): SidePot[] => {
  const levels = [...new Set(players.map((p) => handContributions[p] ?? 0))]
    .filter((x) => x > 0)
    .sort((a, b) => a - b);

  const pots: SidePot[] = [];
  let prev = 0;
  for (const level of levels) {
    const layer = level - prev;
    const contributors = players.filter((p) => (handContributions[p] ?? 0) >= level);
    const amount = layer * contributors.length;
    const eligible = contributors.filter((p) => !folded.has(p));
    if (amount > 0 && eligible.length > 0) {
      pots.push({ amount, eligible });
    }
    prev = level;
  }
  return pots;
};

const strengthForPlayer = (
  pid: string,
  hole: Record<string, Card[]>,
  board: Card[],
  mode: GameMode
): HandStrength | undefined => {
  const h = hole[pid];
  if (!h?.length) return undefined;
  if (mode === 'HOLDEM') {
    if (h.length < 2) return undefined;
    return bestStrengthFromSeven(h, board);
  }
  if (h.length >= 5) return strengthFiveFromHand(h);
  const ranks = h.map((c) => parseCard(c).rank).sort((a, b) => b - a);
  return [0, ...ranks] as HandStrength;
};

export const winnersAmongEligible = (
  eligible: string[],
  hole: Record<string, Card[]>,
  board: Card[],
  mode: GameMode
): string[] => {
  let bestS: HandStrength | undefined;
  let winners: string[] = [];

  for (const pid of eligible) {
    const s = strengthForPlayer(pid, hole, board, mode);
    if (!s) continue;
    if (!bestS) {
      bestS = s;
      winners = [pid];
      continue;
    }
    const cmp = compareStrength(s, bestS);
    if (cmp > 0) {
      bestS = s;
      winners = [pid];
    } else if (cmp === 0) {
      winners.push(pid);
    }
  }
  return winners;
};

export const distributeSidePots = (
  pots: SidePot[],
  hole: Record<string, Card[]>,
  board: Card[],
  mode: GameMode
): { winners: string[]; winnersShare: Record<string, number> } => {
  const winnersShare: Record<string, number> = {};
  const winnerSet = new Set<string>();

  for (const pot of pots) {
    const tied = winnersAmongEligible(pot.eligible, hole, board, mode);
    if (tied.length === 0) continue;
    const share = Math.floor(pot.amount / tied.length);
    const remainder = pot.amount - share * tied.length;
    tied.forEach((w, i) => {
      const extra = i < remainder ? 1 : 0;
      winnersShare[w] = (winnersShare[w] ?? 0) + share + extra;
      winnerSet.add(w);
    });
  }

  return { winners: [...winnerSet], winnersShare };
};

/** Return uncalled chips to the last aggressor (or highest bettor). */
export const uncalledRoundBet = (state: {
  players: string[];
  playerRoundBet: Record<string, number>;
  lastAggressor: string | null;
}): { playerId: string; amount: number } | null => {
  const bets = state.players.map((p) => ({ p, b: state.playerRoundBet[p] ?? 0 }));
  const sorted = [...bets].sort((a, b) => b.b - a.b);
  const mx = sorted[0]?.b ?? 0;
  const second = sorted[1]?.b ?? 0;
  const uncalled = mx - second;
  if (uncalled <= 0) return null;
  const bettor = state.lastAggressor ?? sorted[0]?.p;
  if (!bettor || (state.playerRoundBet[bettor] ?? 0) !== mx) return null;
  return { playerId: bettor, amount: uncalled };
};
