import type { Card, Rank, Suit } from '@duopoker/shared-types/index';
import type { Rng } from './rng';

const suits: Suit[] = ['S', 'H', 'D', 'C'];
const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const createDeck = (): Card[] => suits.flatMap((s) => ranks.map((r) => `${r}${s}` as Card));

export const shuffle = (input: Card[], rng: Rng): Card[] => {
  const deck = [...input];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = rng.nextInt(i + 1);
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
};
