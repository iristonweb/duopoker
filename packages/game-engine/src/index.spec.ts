import { describe, expect, it } from 'vitest';
import type { Card } from '@duopoker/shared-types/index';
import { createInitialTableState, nextPhase, resolveWinner, startNewHand } from './index';

describe('game engine', () => {
  it('advances state phase label', () => {
    expect(nextPhase('DEAL')).toBe('PRE_FLOP');
  });

  it('resolves holdem winner with full board using real ranking', () => {
    const state = {
      ...createInitialTableState('s1', 'HOLDEM', 100, 42),
      players: ['u1', 'u2'],
      stacks: { u1: 500, u2: 500 },
      street: 'RIVER' as const,
      phase: 'RIVER' as const,
      foldedPlayerIds: [] as string[],
      playerRoundBet: { u1: 0, u2: 0 },
      communityCards: ['KD', 'KS', '9C', '2H', '3H'] as Card[],
      playerCards: {
        u1: ['AS', 'AH'] as Card[],
        u2: ['2C', '3D'] as Card[]
      },
      pot: 100,
      activePlayerIndex: 0,
      currentBet: 0,
      actionLog: [],
      deck: [],
      dealerIndex: 0,
      handNumber: 1,
      lastAggressor: null,
      buyIn: 100,
      smallBlind: 1,
      bigBlind: 2,
      sessionId: 's1',
      mode: 'HOLDEM' as const,
      allInPlayerIds: [],
      actedThisRound: { u1: true, u2: true },
      handContributions: { u1: 50, u2: 50 },
      readyForNextHand: []
    };
    expect(resolveWinner(state).winnerId).toBe('u1');
  });

  it('starts a hand when two players seated', () => {
    const s = createInitialTableState('sx', 'HOLDEM', 1000, 7);
    const a1 = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 1000, b: 1000 }
    });
    expect(a1.street).toBe('PREFLOP');
    expect(a1.playerCards.a?.length).toBe(2);
    expect(a1.playerCards.b?.length).toBe(2);
  });
});
