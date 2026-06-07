import { describe, expect, it } from 'vitest';
import { computeSidePots, distributeSidePots, winnersAmongEligible } from './pot-calculator';

describe('computeSidePots', () => {
  it('merges orphan chips when all contributors at a level folded', () => {
    const players = ['a', 'b', 'c'];
    const handContributions = { a: 100, b: 200, c: 100 };
    const folded = new Set(['b']);
    const pots = computeSidePots(players, handContributions, folded);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(400);
    expect(pots.some((p) => p.eligible.includes('a') && p.eligible.includes('c'))).toBe(true);
  });
});

describe('distributeSidePots', () => {
  it('awards 3-way side pot to eligible winner', () => {
    const pots = [
      { amount: 300, eligible: ['a', 'b', 'c'] },
      { amount: 200, eligible: ['b'] }
    ];
    const hole = {
      a: ['AS', 'KS'],
      b: ['AH', 'KH'],
      c: ['2S', '3S']
    };
    const board = ['QS', 'JS', 'TS', '9H', '8H'];
    const { winnersShare } = distributeSidePots(pots, hole, board, 'HOLDEM');
    expect((winnersShare.b ?? 0) + (winnersShare.a ?? 0) + (winnersShare.c ?? 0)).toBe(500);
  });
});

describe('winnersAmongEligible', () => {
  it('picks stronger Holdem hand', () => {
    const w = winnersAmongEligible(
      ['a', 'b'],
      { a: ['AS', 'KS'], b: ['2H', '3H'] },
      ['QS', 'JS', 'TS', '9D', '8C'],
      'HOLDEM'
    );
    expect(w).toEqual(['a']);
  });
});
