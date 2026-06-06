import type { Card, Rank, Suit } from '@duopoker/shared-types/index';
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
  trumpSuit: Suit | null
): Card[] => sharedJokerLegalPlays(hand, leadSuit, trumpSuit) as Card[];

const RANK_ORDER: Rank[] = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const cardRankIndex = (c: Card): number => {
  const r = c[0] as Rank;
  const i = RANK_ORDER.indexOf(r);
  return i >= 0 ? i : 0;
};

/** Last joker in trick wins; else highest trump; else highest card of lead suit. */
export const trickWinnerIndex = (
  plays: { userId: string; card: Card }[],
  playerOrder: string[],
  trumpSuit: Suit | null
): number => {
  if (plays.length === 0) return 0;
  const leadSuit = leadSuitFromTrick(plays);

  let winnerIdx = 0;
  let winnerJokerPos = -1;

  for (let i = 0; i < plays.length; i += 1) {
    const { card } = plays[i]!;
    if (isJokerCard(card)) {
      winnerIdx = i;
      winnerJokerPos = i;
      continue;
    }
    if (winnerJokerPos >= 0) continue;

    const wCard = plays[winnerIdx]!.card;
    if (isJokerCard(wCard)) continue;

    const trump = trumpSuit && cardSuit(card) === trumpSuit;
    const wTrump = trumpSuit && cardSuit(wCard) === trumpSuit;
    if (trump && !wTrump) {
      winnerIdx = i;
      continue;
    }
    if (!trump && wTrump) continue;

    const suit = trump ? trumpSuit! : leadSuit ?? cardSuit(card);
    if (cardSuit(card) !== suit) continue;
    if (cardSuit(wCard) !== suit) {
      winnerIdx = i;
      continue;
    }
    if (cardRankIndex(card) > cardRankIndex(wCard)) {
      winnerIdx = i;
    }
  }

  const winnerId = plays[winnerIdx]!.userId;
  return playerOrder.indexOf(winnerId);
};
