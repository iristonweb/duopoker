import type { Card, Rank, Suit } from '@duopoker/shared-types/index';

/** Russian Joker deck: 36 cards (6–A); 6♠ and 6♣ are wild jokers. */
const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const JOKER_RANKS: Rank[] = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const JOKER_WILD_IDS = ['6S', '6C'] as const satisfies readonly Card[];

export const createJokerDeck = (): Card[] =>
  SUITS.flatMap((s) => JOKER_RANKS.map((r) => `${r}${s}` as Card));
