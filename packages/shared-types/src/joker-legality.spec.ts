import { describe, expect, it } from 'vitest';
import {
  isNominalTrumpBanned,
  jokerLegalPlays,
  isJokerCard,
  leadInfoFromTrick,
  leadSuitFromTrick
} from './joker-legality';

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

  it('requires real trump when void in lead suit (joker still allowed)', () => {
    const hand = ['7D', '6S'];
    const legal = jokerLegalPlays(hand, 'H', 'D');
    expect(legal).toEqual(['7D', '6S']);
  });

  it('allows dump when void in lead and void of real trump (joker is not trump)', () => {
    const hand = ['7D', '8H', '6S'];
    const legal = jokerLegalPlays(hand, 'C', 'S');
    expect(legal).toEqual(['7D', '8H', '6S']);
  });

  it('bans all nominal jokers after void dump in no-trump', () => {
    expect(isNominalTrumpBanned('6S', null, true)).toBe(true);
    expect(isNominalTrumpBanned('6C', null, true)).toBe(true);
    expect(isNominalTrumpBanned('6S', 'S', false)).toBe(false);
    expect(isNominalTrumpBanned('7S', null, true)).toBe(false);
  });

  it('uses first non-joker as lead suit', () => {
    expect(leadSuitFromTrick([{ card: '6S' }, { card: '7H' }])).toBe('H');
    expect(leadSuitFromTrick([{ card: '6S' }])).toBe(null);
    expect(leadSuitFromTrick([{ card: 'TS' }])).toBe('S');
  });

  it('suit-forcing joker lead sets declared suit for followers', () => {
    const info = leadInfoFromTrick([
      { card: '6S', declaration: { suit: 'H', rankMode: 'senior' } }
    ]);
    expect(info).toEqual({ suit: 'H', rankMode: 'senior' });
  });

  it('requires highest of forced suit after senior suit-force lead', () => {
    const hand = ['7H', 'AH', '8S', '6C'];
    const legal = jokerLegalPlays(hand, 'H', null, false, 'senior');
    expect(legal).toContain('AH');
    expect(legal).toContain('6C');
    expect(legal).not.toContain('7H');
    expect(legal).not.toContain('8S');
  });

  it('requires lowest of forced suit after minor suit-force lead', () => {
    const hand = ['7H', 'AH', '8S'];
    const legal = jokerLegalPlays(hand, 'H', null, false, 'minor');
    expect(legal).toEqual(['7H']);
  });
});
