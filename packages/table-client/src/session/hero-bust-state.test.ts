import { describe, expect, it } from 'vitest';
import { computeHeroBustState } from './hero-bust-state';

const base = {
  isJoker: false,
  userId: 'hero',
  sessionPlayers: ['hero', 'villain'],
  heroStack: 0,
  sessionStreet: 'RIVER',
  viewStreet: 'RIVER',
  foldedPlayerIds: [] as string[],
  bustedDismissed: false,
  reduceMotion: false,
  playersWithStackCount: 2
};

describe('computeHeroBustState', () => {
  it('shows all-in banner during runout, not bust overlay', () => {
    const state = computeHeroBustState(base);
    expect(state.showAllInRunoutBanner).toBe(true);
    expect(state.showBustedOverlay).toBe(false);
  });

  it('shows bust overlay only after hand settles on view session', () => {
    const state = computeHeroBustState({
      ...base,
      sessionStreet: 'COMPLETE',
      viewStreet: 'RIVER'
    });
    expect(state.showAllInRunoutBanner).toBe(false);
    expect(state.showBustedOverlay).toBe(false);

    const settled = computeHeroBustState({
      ...base,
      sessionStreet: 'COMPLETE',
      viewStreet: 'COMPLETE'
    });
    expect(settled.showBustedOverlay).toBe(true);
  });

  it('settles immediately when reduceMotion is on', () => {
    const state = computeHeroBustState({
      ...base,
      sessionStreet: 'COMPLETE',
      viewStreet: 'RIVER',
      reduceMotion: true
    });
    expect(state.showBustedOverlay).toBe(true);
  });

  it('does not bust folded hero', () => {
    const state = computeHeroBustState({
      ...base,
      sessionStreet: 'COMPLETE',
      viewStreet: 'COMPLETE',
      foldedPlayerIds: ['hero']
    });
    expect(state.showBustedOverlay).toBe(false);
    expect(state.showAllInRunoutBanner).toBe(false);
  });

  it('does not bust hero who won chips on side pot', () => {
    const state = computeHeroBustState({
      ...base,
      sessionStreet: 'COMPLETE',
      viewStreet: 'COMPLETE',
      heroStack: 500
    });
    expect(state.showBustedOverlay).toBe(false);
    expect(state.heroOutOfChips).toBe(false);
  });

  it('respects bustedDismissed', () => {
    const state = computeHeroBustState({
      ...base,
      sessionStreet: 'COMPLETE',
      viewStreet: 'COMPLETE',
      bustedDismissed: true
    });
    expect(state.showBustedOverlay).toBe(false);
  });
});
