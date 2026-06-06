import { describe, expect, it } from 'vitest';
import { isJokerCard, jokerLegalPlays, leadSuitFromTrick } from './joker-trick';

describe('joker trick legality', () => {
  it('allows joker when must follow suit', () => {
    const legal = jokerLegalPlays(['7S', '6S', '8H'], 'S', 'H');
    expect(legal).toContain('7S');
    expect(legal).toContain('6S');
    expect(legal).not.toContain('8H');
  });

  it('identifies jokers', () => {
    expect(isJokerCard('6S')).toBe(true);
    expect(isJokerCard('6H')).toBe(false);
  });

  it('lead suit skips joker lead', () => {
    expect(leadSuitFromTrick([{ card: '6S' }, { card: '7H' }])).toBe('H');
  });
});
