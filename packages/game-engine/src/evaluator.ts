/**
 * @deprecated Use `bestStrengthFromSeven` / `strengthFiveCards` from `poker-eval`.
 * Kept for backwards compatibility with numeric rough scores in tests.
 */
import type { Card } from '@duopoker/shared-types/index';
import { bestStrengthFromSeven, strengthFiveCards } from './poker-eval';

export const evaluateHoldem = (hole: Card[], board: Card[] = []): number => {
  const s = bestStrengthFromSeven(hole, board);
  return s.reduce((a, n, i) => a + n * 15 ** (7 - i), 0);
};

export const evaluateRaspisnoy = (cards: Card[]): number => {
  const s = strengthFiveCards(cards);
  return s.reduce((a, n, i) => a + n * 15 ** (7 - i), 0);
};
