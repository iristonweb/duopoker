import { describe, expect, it } from 'vitest';
import { heroArrayIndex, heroSeatIndex, resolveSeatLayoutIndex } from './hero-seat';
import { seatPositionStyleForPlayers } from './seat-coordinates';

describe('heroSeatIndex', () => {
  it('places hero at bottom ring slot for common table sizes', () => {
    expect(heroSeatIndex(2)).toBe(1);
    expect(heroSeatIndex(4)).toBe(3);
    expect(heroSeatIndex(6)).toBe(3);
  });
});

describe('heroArrayIndex', () => {
  it('clamps rotation target to valid array bounds', () => {
    expect(heroArrayIndex(3)).toBe(2);
    expect(heroArrayIndex(6)).toBe(3);
  });
});

describe('resolveSeatLayoutIndex', () => {
  const sixMax = [
    { isHero: true },
    { isHero: false },
    { isHero: false },
    { isHero: false },
    { isHero: false },
    { isHero: false }
  ];

  it('maps hero to bottom ring even when hero is first in array', () => {
    expect(resolveSeatLayoutIndex(0, sixMax)).toBe(3);
  });

  it('maps opponents around the ring when hero failed rotation', () => {
    expect(resolveSeatLayoutIndex(1, sixMax)).toBe(0);
    expect(resolveSeatLayoutIndex(2, sixMax)).toBe(1);
    expect(resolveSeatLayoutIndex(3, sixMax)).toBe(2);
    expect(resolveSeatLayoutIndex(4, sixMax)).toBe(4);
    expect(resolveSeatLayoutIndex(5, sixMax)).toBe(5);
  });

  it('keeps ring index when hero is already rotated to bottom slot', () => {
    const rotated = [
      { isHero: false },
      { isHero: false },
      { isHero: false },
      { isHero: true },
      { isHero: false },
      { isHero: false }
    ];
    expect(resolveSeatLayoutIndex(3, rotated)).toBe(3);
    expect(resolveSeatLayoutIndex(0, rotated)).toBe(0);
    expect(resolveSeatLayoutIndex(4, rotated)).toBe(4);
  });

  it('anchors hero seat to bottom even when hero is first in array', () => {
    const sixMax = [
      { isHero: true },
      { isHero: false },
      { isHero: false },
      { isHero: false },
      { isHero: false },
      { isHero: false }
    ];
    expect(seatPositionStyleForPlayers(0, sixMax)).toMatchObject({
      left: '50%',
      bottom: '8%',
      transform: 'translateX(-50%)'
    });
  });
});
