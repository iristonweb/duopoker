import { describe, expect, it } from 'vitest';
import { isJokerCard, jokerLegalPlays, leadSuitFromTrick, trickWinnerIndex } from './joker-trick';

describe('joker trick legality', () => {
  it('allows joker when must follow suit', () => {
    const legal = jokerLegalPlays(['7S', '6S', '8H'], 'S', 'H');
    expect(legal).toContain('7S');
    expect(legal).toContain('6S');
    expect(legal).not.toContain('8H');
  });

  it('identifies both wild jokers', () => {
    expect(isJokerCard('6S')).toBe(true);
    expect(isJokerCard('6C')).toBe(true);
    expect(isJokerCard('6H')).toBe(false);
  });

  it('lead suit skips joker lead', () => {
    expect(leadSuitFromTrick([{ card: '6S' }, { card: '7H' }])).toBe('H');
  });
});

describe('trickWinnerIndex', () => {
  const order = ['a', 'b'];

  it('trump beats lead suit', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '7H' },
        { userId: 'b', card: '9D' }
      ],
      order,
      'D'
    );
    expect(order[idx]).toBe('b');
  });

  it('last joker wins the trick', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '6S' },
        { userId: 'b', card: '6C' }
      ],
      order,
      'H'
    );
    expect(order[idx]).toBe('b');
  });

  it('highest lead suit card wins without trump', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '7H' },
        { userId: 'b', card: 'TH' }
      ],
      order,
      null
    );
    expect(order[idx]).toBe('b');
  });
});
