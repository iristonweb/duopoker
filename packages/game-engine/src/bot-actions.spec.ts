import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import { createInitialTableState } from './holdem-table';
import { pickBotAction } from './bot-actions';
import { mixHandSeed } from './rng';
import { shuffle, createDeck } from './cards';
import { SeededRng } from './rng';

const botId = 'duopoker-bot-1';
const humanId = 'human-1';

const baseHoldem = (): SessionState => {
  const s = createInitialTableState('sess', 'HOLDEM', 100, 42);
  return {
    ...s,
    players: [humanId, botId],
    stacks: { [humanId]: 100, [botId]: 100 },
    handNumber: 1,
    street: 'FLOP',
    phase: 'FLOP',
    communityCards: ['2S', '7D', 'TC'],
    playerCards: {
      [humanId]: ['AS', 'KS'],
      [botId]: ['3H', '4C']
    },
    foldedPlayerIds: [],
    playerRoundBet: { [humanId]: 0, [botId]: 0 },
    currentBet: 0,
    activePlayerIndex: 1,
    activePlayerId: botId,
    actionLog: [],
    pot: 20,
    bigBlind: 2,
    smallBlind: 1,
    dealerIndex: 0,
    lastRaiseSize: 2,
    actedThisRound: { [humanId]: true, [botId]: false },
    handContributions: { [humanId]: 10, [botId]: 10 },
    allInPlayerIds: []
  };
};

describe('mixHandSeed', () => {
  it('differs per hand number', () => {
    expect(mixHandSeed(42, 0)).not.toBe(mixHandSeed(42, 1));
  });
});

describe('shuffle', () => {
  it('permutes deck without bias via nextInt', () => {
    const rng = new SeededRng(12345);
    const out = shuffle(createDeck(), rng);
    expect(out).toHaveLength(52);
    expect(new Set(out).size).toBe(52);
    const again = shuffle(createDeck(), new SeededRng(12345));
    expect(out).toEqual(again);
  });
});

describe('pickBotAction', () => {
  it('checks with a strong hand when free', () => {
    const state = {
      ...baseHoldem(),
      playerCards: { [humanId]: ['3H', '4C'], [botId]: ['AS', 'AH'] },
      communityCards: ['AD', '7S', '2C'],
      playerRoundBet: { [humanId]: 0, [botId]: 0 },
      currentBet: 0
    };
    const action = pickBotAction(state, botId);
    expect(['check', 'bet', 'raise']).toContain(action.type);
  });

  it('folds trash facing a large bet', () => {
    const state = {
      ...baseHoldem(),
      pot: 10,
      playerRoundBet: { [humanId]: 30, [botId]: 0 },
      currentBet: 30,
      actionLog: [{ sessionId: 'sess', userId: humanId, type: 'raise', amount: 30, at: 1 }]
    };
    const action = pickBotAction(state, botId);
    expect(action.type).toBe('fold');
  });

  it('raises or calls with the nuts facing a bet', () => {
    const state = {
      ...baseHoldem(),
      playerCards: { [humanId]: ['3H', '4C'], [botId]: ['AS', 'KS'] },
      communityCards: ['QS', 'JS', 'TS'],
      pot: 40,
      playerRoundBet: { [humanId]: 10, [botId]: 0 },
      currentBet: 10,
      actionLog: [{ sessionId: 'sess', userId: humanId, type: 'bet', amount: 10, at: 1 }]
    };
    const action = pickBotAction(state, botId);
    expect(['call', 'raise']).toContain(action.type);
  });

  it('can 3-bet with a premium hand facing a raise', () => {
    const state = {
      ...baseHoldem(),
      street: 'PREFLOP',
      phase: 'PRE_FLOP',
      communityCards: [],
      playerCards: { [humanId]: ['7C', '2D'], [botId]: ['AS', 'AD'] },
      pot: 3,
      playerRoundBet: { [humanId]: 6, [botId]: 2 },
      currentBet: 6,
      actionLog: [{ sessionId: 'sess', userId: humanId, type: 'raise', amount: 4, at: 1 }]
    };
    const action = pickBotAction(state, botId);
    expect(['call', 'raise']).toContain(action.type);
  });
});
