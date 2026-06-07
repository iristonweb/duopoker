import { describe, expect, it } from 'vitest';
import { bubbleOffset, seatCoordinates } from './seat-coordinates';

describe('seatCoordinates', () => {
  it('places heads-up seats top and bottom', () => {
    expect(seatCoordinates(0, 2)).toMatchObject({ left: 50, top: 10, anchor: 'center' });
    expect(seatCoordinates(1, 2)).toMatchObject({ left: 50, top: 92, anchor: 'bottom' });
  });

  it('returns six positions for full ring', () => {
    const positions = Array.from({ length: 6 }, (_, i) => seatCoordinates(i, 6));
    expect(positions).toHaveLength(6);
    expect(new Set(positions.map((p) => `${p.left},${p.top}`)).size).toBeGreaterThan(3);
  });
});

describe('bubbleOffset', () => {
  it('offsets bubbles inward from seats', () => {
    const above = bubbleOffset(0, 2);
    expect(above.anchor).toBe('below');
    const below = bubbleOffset(1, 2);
    expect(below.anchor).toBe('above');
  });
});
