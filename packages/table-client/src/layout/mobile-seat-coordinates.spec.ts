import { describe, expect, it } from 'vitest';
import { isHeroSeatIndex, mobileSeatCoordinates } from './mobile-seat-coordinates';

describe('mobileSeatCoordinates', () => {
  it('places hero at bottom for all table sizes', () => {
    for (const total of [2, 3, 4, 5, 6]) {
      const hero = mobileSeatCoordinates(total - 1, total);
      expect(hero.anchor).toBe('bottom');
      expect(hero.top).toBeGreaterThan(80);
      expect(isHeroSeatIndex(total - 1, total)).toBe(true);
    }
  });

  it('places opponents along top arc without extreme overlap', () => {
    for (const total of [3, 4, 5, 6]) {
      const opponents = Array.from({ length: total - 1 }, (_, i) => mobileSeatCoordinates(i, total));
      for (const pos of opponents) {
        expect(pos.top).toBeLessThan(50);
        expect(pos.left).toBeGreaterThan(5);
        expect(pos.left).toBeLessThan(95);
      }
      const xs = opponents.map((p) => p.left);
      const minGap = Math.min(...xs.slice(1).map((x, i) => Math.abs(x - xs[i]!)));
      expect(minGap).toBeGreaterThan(8);
    }
  });

  it('supports heads-up with opponent on top', () => {
    const opp = mobileSeatCoordinates(0, 2);
    expect(opp.top).toBeLessThan(20);
    expect(opp.left).toBe(50);
  });
});
