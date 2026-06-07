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

  it('senior joker declaration beats high lead card', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: 'AH' },
        { userId: 'b', card: '6S', declaration: 'senior' }
      ],
      order,
      null
    );
    expect(order[idx]).toBe('b');
  });

  it('last taking joker wins when both declare senior sequentially', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '6S', declaration: 'senior' },
        { userId: 'b', card: '6C', declaration: 'senior' }
      ],
      order,
      'H'
    );
    expect(order[idx]).toBe('b');
  });

  it('first taking joker wins when both declare senior non-sequentially', () => {
    const four = ['n', 'e', 's', 'w'];
    const idx = trickWinnerIndex(
      [
        { userId: 'n', card: '6S', declaration: 'senior' },
        { userId: 'e', card: 'KH' },
        { userId: 's', card: '6C', declaration: 'senior' },
        { userId: 'w', card: 'AH' }
      ],
      four,
      null
    );
    expect(four[idx]).toBe('n');
  });

  it('senior joker beats minor joker', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '6S', declaration: 'minor' },
        { userId: 'b', card: '6C', declaration: 'senior' }
      ],
      order,
      null
    );
    expect(order[idx]).toBe('b');
  });

  it('minor joker does not take trick — regular card wins', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '6S', declaration: 'minor' },
        { userId: 'b', card: 'AH' }
      ],
      order,
      null
    );
    expect(order[idx]).toBe('b');
  });

  it('lead suit low joker does not take trick', () => {
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '6S', declaration: { suit: 'H', rankMode: 'minor' } },
        { userId: 'b', card: '7H' }
      ],
      order,
      null
    );
    expect(order[idx]).toBe('b');
  });

  it('last taking joker wins when three taking jokers appear (rule extension)', () => {
    const order = ['a', 'b', 'c', 'd'];
    const idx = trickWinnerIndex(
      [
        { userId: 'a', card: '6S', declaration: 'senior' },
        { userId: 'b', card: '6C', declaration: 'senior' },
        { userId: 'c', card: '6S', declaration: 'senior' },
        { userId: 'd', card: 'AH' }
      ],
      order,
      null
    );
    expect(order[idx]).toBe('c');
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
