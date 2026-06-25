import { describe, expect, it } from 'vitest';
import { bubbleOffset, seatCoordinates, seatPositionStyle } from './seat-coordinates';

describe('seatCoordinates', () => {
  it('places heads-up seats top and bottom', () => {
    expect(seatCoordinates(0, 2)).toMatchObject({ left: 50, top: 10, anchor: 'center' });
    expect(seatCoordinates(1, 2)).toMatchObject({ left: 50, top: 92, anchor: 'bottom' });
  });

  it('places four players in a cross ring', () => {
    expect(seatCoordinates(0, 4)).toMatchObject({ left: 50, top: 8 });
    expect(seatCoordinates(1, 4)).toMatchObject({ left: 92, top: 48 });
    expect(seatCoordinates(2, 4)).toMatchObject({ left: 8, top: 48 });
    expect(seatCoordinates(3, 4)).toMatchObject({ left: 50, top: 92, anchor: 'bottom' });
  });
});

describe('seatPositionStyle', () => {
  it('uses bottom-anchor transform for hero seats', () => {
    expect(seatPositionStyle(1, 2)).toMatchObject({
      left: '50%',
      top: '92%',
      transform: 'translate(-50%, -100%)'
    });
    expect(seatPositionStyle(0, 2).transform).toBe('translate(-50%, -50%)');
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
