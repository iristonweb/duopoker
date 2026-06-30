import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { totalInKettle, toCall } from './holdem/helpers';
import { bestStrengthFromSeven, parseCard } from './poker-eval';
import { botDecisionRng } from './bot-rng';

export const BOT_USER_PREFIX = 'duopoker-bot';

export const isAutomatedPlayer = (userId: string): boolean => userId.startsWith(BOT_USER_PREFIX);

export const maxRoundBet = (state: SessionState): number =>
  state.players.reduce((m, p) => Math.max(m, state.playerRoundBet[p] ?? 0), 0);

export const amountToCall = (state: SessionState, userId: string): number => toCall(state, userId);

const CATEGORY_BASE = [0.12, 0.38, 0.52, 0.66, 0.76, 0.86, 0.93, 0.97, 0.99] as const;

const preflopStrength = (hole: Card[]): number => {
  if (hole.length < 2) return 0.2;
  const a = parseCard(hole[0]!);
  const b = parseCard(hole[1]!);
  const hi = Math.max(a.rank, b.rank);
  const lo = Math.min(a.rank, b.rank);
  const suited = a.suit === b.suit;
  const pair = a.rank === b.rank;
  if (pair) return 0.52 + hi / 24;
  let score = (hi / 12) * 0.38 + (lo / 12) * 0.18;
  if (suited) score += 0.09;
  if (hi >= 10 && lo >= 8) score += 0.08;
  if (hi - lo <= 2 && hi >= 7) score += 0.07;
  return Math.min(0.88, score);
};

const postflopStrength = (hole: Card[], board: Card[]): number => {
  if (board.length === 0) return preflopStrength(hole);
  try {
    const s = bestStrengthFromSeven(hole, board);
    const cat = Math.min(8, Math.max(0, s[0] ?? 0));
    const kicker = ((s[1] ?? 0) / 12) * 0.04;
    return Math.min(0.995, (CATEGORY_BASE[cat] ?? 0.12) + kicker);
  } catch {
    return preflopStrength(hole);
  }
};

const estimateWinChance = (state: SessionState, userId: string): number => {
  const hole = state.playerCards[userId] ?? [];
  if (hole.length < 2) return 0.15;
  if (state.street === 'PREFLOP' || state.communityCards.length === 0) {
    return preflopStrength(hole);
  }
  return postflopStrength(hole, state.communityCards);
};

const pickRaiseIncrement = (
  state: SessionState,
  userId: string,
  strength: number,
  rng: ReturnType<typeof botDecisionRng>
): number => {
  const minRaise = state.lastRaiseSize ?? state.bigBlind;
  const pot = totalInKettle(state);
  const need = toCall(state, userId);
  const potAfterCall = pot + need;
  const roll = rng.next();
  let factor = 0.55;
  if (strength > 0.85) factor = roll < 0.35 ? 0.85 : 0.65;
  else if (strength > 0.7) factor = 0.5 + roll * 0.2;
  else if (roll < 0.25) factor = 0.4;
  const target = Math.max(minRaise, Math.round(potAfterCall * factor));
  return Math.max(minRaise, target);
};

const facingAggression = (state: SessionState, userId: string): boolean => {
  const need = toCall(state, userId);
  if (need === 0) return false;
  const last = state.actionLog[state.actionLog.length - 1];
  return last?.type === 'bet' || last?.type === 'raise';
};

/** Tag-aware bot: pot odds, position-style aggression, and seeded variance. */
export const pickBotAction = (state: SessionState, userId: string): PlayerAction => {
  const at = Date.now();
  const base = { sessionId: state.sessionId, userId, at };
  const need = toCall(state, userId);
  const stack = state.stacks[userId] ?? 0;
  const pot = totalInKettle(state);
  const strength = estimateWinChance(state, userId);
  const rng = botDecisionRng(state, userId);
  const roll = rng.next();
  const canBet = stack > 0;
  const prevMax = maxRoundBet(state);

  if (need === 0) {
    const bluffSpot =
      state.communityCards.length >= 3 && !facingAggression(state, userId) && roll < 0.12;
    const valueBet = strength > 0.72 && roll < 0.58;
    const thinBet = strength > 0.58 && strength <= 0.72 && roll < 0.22;
    if (canBet && (valueBet || thinBet || bluffSpot)) {
      const inc = pickRaiseIncrement(state, userId, bluffSpot ? 0.45 : strength, rng);
      const type = prevMax === 0 ? 'bet' : 'raise';
      return { ...base, type, amount: inc };
    }
    return { ...base, type: 'check' };
  }

  if (!canBet) {
    return { ...base, type: 'fold' };
  }

  const potOdds = need / Math.max(1, pot + need);
  const callThreshold = potOdds + (facingAggression(state, userId) ? 0.06 : 0.03);
  const margin = strength - callThreshold;

  if (margin < -0.18) {
    if (roll < 0.08 && need <= state.bigBlind * 2) {
      return { ...base, type: 'call' };
    }
    return { ...base, type: 'fold' };
  }

  if (margin > 0.22 && need > 0 && roll < 0.35 && need < stack) {
    const inc = pickRaiseIncrement(state, userId, strength, rng);
    return { ...base, type: 'raise', amount: inc };
  }

  if (margin < 0.05 && need > stack * 0.35 && roll > 0.55) {
    return { ...base, type: 'fold' };
  }

  return { ...base, type: 'call' };
};
