import type { Card, Rank, Suit } from '@duopoker/shared-types/index';
import { JOKER_WILD_IDS } from './joker-deck';

const RANK_ORDER: Rank[] = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const isJokerCard = (c: Card): boolean =>
  (JOKER_WILD_IDS as readonly string[]).includes(c);

export const cardSuit = (c: Card): Suit => c[1] as Suit;

export const cardRankIndex = (c: Card): number => {
  const r = c[0] as Rank;
  const i = RANK_ORDER.indexOf(r);
  return i >= 0 ? i : 0;
};

export const legalPlays = (
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null
): Card[] => {
  if (!leadSuit) return [...hand];
  const follow = hand.filter((c) => !isJokerCard(c) && cardSuit(c) === leadSuit);
  if (follow.length > 0) return follow;
  if (trumpSuit) {
    const trumps = hand.filter((c) => isJokerCard(c) || cardSuit(c) === trumpSuit);
    if (trumps.length > 0) return trumps;
  }
  return [...hand];
};

/** Last joker in trick wins; else highest trump; else highest card of lead suit. */
export const trickWinnerIndex = (
  plays: { userId: string; card: Card }[],
  playerOrder: string[],
  trumpSuit: Suit | null
): number => {
  if (plays.length === 0) return 0;
  const leadSuit = isJokerCard(plays[0]!.card) ? null : cardSuit(plays[0]!.card);

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
