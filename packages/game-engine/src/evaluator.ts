import type { Card } from '@duopoker/shared-types/index';

const rankOrder = '23456789TJQKA';

export const evaluateHoldem = (cards: Card[]): number => {
  return cards.reduce((sum, card) => sum + rankOrder.indexOf(card[0]), 0);
};

export const evaluateRaspisnoy = (cards: Card[]): number => {
  return cards.reduce((sum, card) => sum + (card[0] === 'A' ? 15 : rankOrder.indexOf(card[0]) + 2), 0);
};
