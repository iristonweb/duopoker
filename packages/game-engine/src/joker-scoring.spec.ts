import { describe, expect, it } from 'vitest';
import type { JokerDealRecord } from '@duopoker/shared-types/index';
import { applyPoolPremiums, jokerPointsForHand, jokerPointsForHandMinus } from './joker-scoring';

describe('jokerPointsForHand', () => {
  it('awards pass bonus for zero bid zero tricks', () => {
    expect(jokerPointsForHand(0, 0, 5)).toBe(50);
  });

  it('applies hisht penalty', () => {
    expect(jokerPointsForHand(3, 0, 5)).toBe(-500);
  });

  it('awards exact bid bonus for 3 cards dealt', () => {
    expect(jokerPointsForHand(3, 3, 3)).toBe(300);
  });

  it('uses minus scoring when mode is minus', () => {
    expect(jokerPointsForHand(4, 2, 5, 'minus')).toBe(-200);
    expect(jokerPointsForHand(4, 4, 5, 'minus')).toBe(400);
  });
});

describe('jokerPointsForHandMinus', () => {
  it('penalizes underbid by 100 per trick', () => {
    expect(jokerPointsForHandMinus(5, 3, 5)).toBe(-200);
  });
});

describe('applyPoolPremiums', () => {
  const poolDeals: JokerDealRecord[] = [
    {
      matchHandIndex: 0,
      pool: 1,
      cardsThisDeal: 1,
      bids: { a: 0, b: 1 },
      tricksWon: { a: 0, b: 0 },
      handPoints: { a: 50, b: -100 }
    },
    {
      matchHandIndex: 1,
      pool: 1,
      cardsThisDeal: 2,
      bids: { a: 1, b: 2 },
      tricksWon: { a: 1, b: 1 },
      handPoints: { a: 200, b: -100 }
    }
  ];

  it('penalizes non-premium when one player earns pool premium', () => {
    const scores = { a: 250, b: -200 };
    const { scores: next, premiums } = applyPoolPremiums(1, poolDeals, ['a', 'b'], scores);
    expect(premiums.a).toBe(200);
    expect(premiums.b).toBeUndefined();
    expect(next.a).toBe(450);
    expect(next.b).toBe(-200);
  });
});
