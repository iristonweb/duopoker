/**
 * @deprecated Use `bestStrengthFromSeven` / `strengthFiveCards` from `poker-eval`.
 * Kept for backwards compatibility with numeric rough scores in tests.
 */
import type { Card } from '@duopoker/shared-types/index';
import { bestStrengthFromSeven, parseCard, strengthFiveCards } from './poker-eval';

export const evaluateHoldem = (hole: Card[], board: Card[] = []): number => {
  const s = bestStrengthFromSeven(hole, board);
  return s.reduce((a, n, i) => a + n * 15 ** (7 - i), 0);
};

/**
 * @deprecated Legacy 5-card poker scoring — not used by live trick-taking JOKER (Расписной).
 */
export const evaluateJoker = (cards: Card[]): number => {
  const s =
    cards.length >= 5
      ? strengthFiveCards(cards)
      : ([0, ...cards.map((c) => parseCard(c).rank).sort((a, b) => b - a)] as const);
  return s.reduce((a, n, i) => a + n * 15 ** (7 - i), 0);
};

/** @deprecated Use `evaluateJoker`. */
export const evaluateRaspisnoy = evaluateJoker;
