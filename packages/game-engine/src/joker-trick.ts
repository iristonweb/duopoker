import type { Card, JokerDeclaration, JokerTrickPlay, Rank, Suit } from '@duopoker/shared-types/index';
import {
  cardSuit as sharedCardSuit,
  isJokerCard as sharedIsJokerCard,
  jokerLegalPlays as sharedJokerLegalPlays,
  leadSuitFromTrick as sharedLeadSuitFromTrick,
  normalizeJokerCard as sharedNormalizeJokerCard
} from '@duopoker/shared-types/index';

export const isJokerCard = sharedIsJokerCard;
export const cardSuit = sharedCardSuit;
export const leadSuitFromTrick = sharedLeadSuitFromTrick;

export const normalizeJokerCard = (raw: string): Card | null =>
  sharedNormalizeJokerCard(raw) as Card | null;

export const jokerLegalPlays = (
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  strictJoker = false
): Card[] => sharedJokerLegalPlays(hand, leadSuit, trumpSuit, strictJoker) as Card[];

const RANK_ORDER: Rank[] = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const cardRankIndex = (c: Card): number => {
  const r = c[0] as Rank;
  const i = RANK_ORDER.indexOf(r);
  return i >= 0 ? i : 0;
};

const effectiveLeadSuit = (plays: JokerTrickPlay[]): Suit | null => {
  const first = plays[0];
  if (!first) return null;
  if (isJokerCard(first.card) && first.declaration && typeof first.declaration === 'object') {
    return first.declaration.suit;
  }
  return leadSuitFromTrick(plays);
};

const playStrength = (
  play: JokerTrickPlay,
  leadSuit: Suit | null,
  trumpSuit: Suit | null
): { strength: number; asTrump: boolean } => {
  const { card, declaration } = play;

  if (isJokerCard(card)) {
    if (declaration === 'senior') return { strength: 1000, asTrump: true };
    if (declaration === 'minor') return { strength: -1, asTrump: false };
    if (declaration === 'nominal') {
      const suit = cardSuit(card);
      const isTrump = trumpSuit !== null && suit === trumpSuit;
      return { strength: cardRankIndex(card), asTrump: isTrump };
    }
    if (declaration && typeof declaration === 'object') {
      const isTrump = trumpSuit !== null && declaration.suit === trumpSuit;
      const rank =
        declaration.rankMode === 'senior' ? 1000 : declaration.rankMode === 'minor' ? -1 : 500;
      return { strength: rank, asTrump: isTrump || declaration.suit === trumpSuit };
    }
    return { strength: 500, asTrump: false };
  }

  const suit = cardSuit(card);
  const isTrump = trumpSuit !== null && suit === trumpSuit;
  const followsLead = leadSuit !== null && suit === leadSuit;
  if (isTrump) return { strength: cardRankIndex(card), asTrump: true };
  if (followsLead) return { strength: cardRankIndex(card), asTrump: false };
  return { strength: -2, asTrump: false };
};

/** Minor / non-taking joker declarations do not win the trick. */
export const jokerTakesTrick = (play: JokerTrickPlay): boolean => {
  if (!isJokerCard(play.card)) return false;
  const d = play.declaration;
  if (d === 'minor') return false;
  if (d && typeof d === 'object' && d.rankMode === 'minor') return false;
  return true;
};

const compareNonJoker = (
  cur: JokerTrickPlay,
  winner: JokerTrickPlay,
  leadSuit: Suit | null,
  trumpSuit: Suit | null
): boolean => {
  const curScore = playStrength(cur, leadSuit, trumpSuit);
  const winScore = playStrength(winner, leadSuit, trumpSuit);
  if (curScore.asTrump && !winScore.asTrump) return true;
  if (!curScore.asTrump && winScore.asTrump) return false;
  const suit =
    curScore.asTrump && trumpSuit ? trumpSuit : leadSuit ?? cardSuit(cur.card);
  if (cardSuit(cur.card) !== suit && !curScore.asTrump) return false;
  if (cardSuit(winner.card) !== suit && !winScore.asTrump) return true;
  return curScore.strength > winScore.strength;
};

const takingJokerIndices = (plays: JokerTrickPlay[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < plays.length; i += 1) {
    const play = plays[i]!;
    if (isJokerCard(play.card) && jokerTakesTrick(play)) out.push(i);
  }
  return out;
};

/** Club rules: adjacent taking jokers → last wins; non-adjacent → first wins. */
const winningTakingJokerIndex = (plays: JokerTrickPlay[]): number | null => {
  const indices = takingJokerIndices(plays);
  if (indices.length === 0) return null;
  if (indices.length === 1) return indices[0]!;
  if (indices.length === 2) {
    const [a, b] = indices;
    return Math.abs(b! - a!) === 1 ? b! : a!;
  }
  return indices[indices.length - 1]!;
};

/** Taking jokers beat regular cards; two-joker disputes use sequential vs non-sequential rule. */
export const trickWinnerIndex = (
  plays: { userId: string; card: Card; declaration?: JokerDeclaration }[],
  playerOrder: string[],
  trumpSuit: Suit | null
): number => {
  if (plays.length === 0) return 0;
  const typed = plays as JokerTrickPlay[];
  const leadSuit = effectiveLeadSuit(typed);

  const takingJokerIdx = winningTakingJokerIndex(typed);
  if (takingJokerIdx !== null) {
    return playerOrder.indexOf(typed[takingJokerIdx]!.userId);
  }

  let winnerIdx = 0;
  for (let i = 0; i < typed.length; i += 1) {
    const play = typed[i]!;
    if (isJokerCard(play.card)) continue;
    const wPlay = typed[winnerIdx]!;
    if (isJokerCard(wPlay.card)) {
      winnerIdx = i;
      continue;
    }
    if (compareNonJoker(play, wPlay, leadSuit, trumpSuit)) {
      winnerIdx = i;
    }
  }

  return playerOrder.indexOf(typed[winnerIdx]!.userId);
};
