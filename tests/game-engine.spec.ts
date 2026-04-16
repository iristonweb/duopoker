import { describe, expect, it } from 'vitest';
import { applyAction, createInitialState, nextPhase, resolveWinner } from '../packages/game-engine/src/index';

describe('game engine', () => {
  it('advances state phase', () => {
    expect(nextPhase('DEAL')).toBe('PRE_FLOP');
  });

  it('increases pot when action has amount', () => {
    const state = createInitialState('s1', 'HOLDEM');
    expect(
      applyAction(state, {
        sessionId: 's1',
        userId: 'u1',
        type: 'bet',
        amount: 100,
        at: Date.now()
      }).pot
    ).toBe(100);
  });

  it('resolves winner by score', () => {
    const state = createInitialState('s1', 'HOLDEM');
    state.playerCards = { u1: ['AS', 'KH'], u2: ['2C', '3D'] };
    expect(resolveWinner(state).winnerId).toBe('u1');
  });
});
