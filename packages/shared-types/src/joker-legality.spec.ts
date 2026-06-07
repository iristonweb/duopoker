import { describe, expect, it } from 'vitest';
import { isNominalTrumpBanned, jokerLegalPlays, isJokerCard, leadSuitFromTrick } from './joker-legality';

describe('joker legality', () => {
  it('treats 6S and 6C as jokers', () => {
    expect(isJokerCard('6S')).toBe(true);
    expect(isJokerCard('6C')).toBe(true);
    expect(isJokerCard('6H')).toBe(false);
  });

  it('allows joker when must follow suit', () => {
    const hand = ['7S', '6S', '8H'];
    const legal = jokerLegalPlays(hand, 'S', 'H');
    expect(legal).toContain('7S');
    expect(legal).toContain('6S');
    expect(legal).not.toContain('8H');
  });

  it('allows any card when leading', () => {
    expect(jokerLegalPlays(['6S', 'AH'], null, 'D')).toEqual(['6S', 'AH']);
  });

  it('strict mode blocks joker lead when holding suit cards', () => {
    const hand = ['7S', '6S', '8H'];
    const legal = jokerLegalPlays(hand, null, 'H', true);
    expect(legal).not.toContain('6S');
    expect(legal).toContain('7S');
  });

  it('strict mode still allows joker when following suit', () => {
    const hand = ['7S', '6S', '8H'];
    const legal = jokerLegalPlays(hand, 'S', 'H', true);
    expect(legal).toContain('6S');
  });

  it('requires trump when void in lead suit', () => {
    const hand = ['7D', '6S'];
    const legal = jokerLegalPlays(hand, 'H', 'D');
    expect(legal).toEqual(['7D', '6S']);
  });

  it('detects banned nominal trump joker after void dump', () => {
    expect(isNominalTrumpBanned('6S', 'S', true)).toBe(true);
    expect(isNominalTrumpBanned('6C', 'S', true)).toBe(false);
    expect(isNominalTrumpBanned('6S', 'S', false)).toBe(false);
  });

  it('uses first non-joker as lead suit', () => {
    expect(leadSuitFromTrick([{ card: '6S' }, { card: '7H' }])).toBe('H');
    expect(leadSuitFromTrick([{ card: '6S' }])).toBe(null);
    expect(leadSuitFromTrick([{ card: 'TS' }])).toBe('S');
  });
});
