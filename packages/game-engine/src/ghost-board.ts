import type { Card } from '@duopoker/shared-types/index';

/** Burn one card, then take n from the top — same rules as live dealing. */
const burnAndTake = (deck: Card[], n: number): { cards: Card[]; deck: Card[] } => {
  let d = deck.length ? deck.slice(1) : deck;
  const cards: Card[] = [];
  for (let i = 0; i < n && d.length; i += 1) {
    cards.push(d[0]!);
    d = d.slice(1);
  }
  return { cards, deck: d };
};

/** What the board would have been if the hand continued (preflop muck-win). */
export const peekGhostCommunityFromDeck = (deck: Card[]): Card[] => {
  let d = [...deck];
  const flop = burnAndTake(d, 3);
  d = flop.deck;
  const turn = burnAndTake(d, 1);
  d = turn.deck;
  const river = burnAndTake(d, 1);
  return [...flop.cards, ...turn.cards, ...river.cards];
};
