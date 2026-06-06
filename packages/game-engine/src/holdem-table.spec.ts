import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import {
  applyTableAction,
  createInitialTableState,
  markReadyForNextHand,
  sanitizeStateForViewer,
  startNewHand
} from './index';

const baseHand = (): SessionState => {
  const s = createInitialTableState('s1', 'HOLDEM', 100, 42);
  return startNewHand({
    ...s,
    players: ['u1', 'u2'],
    stacks: { u1: 100, u2: 100 }
  });
};

describe('sanitizeStateForViewer', () => {
  it('hides opponent hole cards and deck before showdown', () => {
    const state = baseHand();
    const view = sanitizeStateForViewer(state, 'u1');
    expect(view.playerCards.u1?.length).toBe(2);
    expect(view.playerCards.u2).toEqual([]);
    expect(view.deck).toEqual([]);
  });

  it('reveals all cards at COMPLETE', () => {
    const state = { ...baseHand(), street: 'COMPLETE' as const, phase: 'SHOWDOWN' as const };
    const view = sanitizeStateForViewer(state, 'u1');
    expect(view.playerCards.u2?.length).toBe(2);
  });

  it('hides ghost board from free viewers', () => {
    const state = {
      ...baseHand(),
      street: 'COMPLETE' as const,
      ghostCommunityCards: ['AS', 'KS', 'QS', 'JS', 'TS'] as SessionState['ghostCommunityCards']
    };
    const free = sanitizeStateForViewer(state, 'u1', { subscriptionTier: 'FREE' });
    expect(free.ghostCommunityCards).toBeUndefined();
    const silver = sanitizeStateForViewer(state, 'u1', { subscriptionTier: 'SILVER' });
    expect(silver.ghostCommunityCards?.length).toBe(5);
  });
});

describe('applyTableAction — heads-up Hold\'em', () => {
  it('completes preflop when SB calls and BB checks', () => {
    let state = baseHand();
    const sb = state.players[state.activePlayerIndex]!;
    const bb = state.players.find((p) => p !== sb)!;

    let r = applyTableAction(state, { sessionId: 's1', userId: sb, type: 'call', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    state = r.state;

    expect(state.players[state.activePlayerIndex]).toBe(bb);
    r = applyTableAction(state, { sessionId: 's1', userId: bb, type: 'check', at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('FLOP');
  });

  it('awards pot when opponent folds', () => {
    const state = baseHand();
    const actor = state.players[state.activePlayerIndex]!;
    const r = applyTableAction(state, { sessionId: 's1', userId: actor, type: 'fold', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('COMPLETE');
    expect(r.state.winners?.length).toBe(1);
    expect(r.state.ghostCommunityCards?.length).toBe(5);
  });
});

describe('applyTableAction — short all-in', () => {
  it('closes betting when short stack is all-in and other player calls', () => {
    let s = createInitialTableState('s2', 'HOLDEM', 100, 99);
    s = startNewHand({
      ...s,
      players: ['short', 'deep'],
      stacks: { short: 5, deep: 200 }
    });
    const first = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 's2', userId: first, type: 'call', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    const second = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 's2', userId: second, type: 'check', at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(['FLOP', 'COMPLETE']).toContain(r.state.street);
  });
});

describe('applyTableAction — split pot', () => {
  it('splits pot on identical Hold\'em hands at showdown', () => {
    const state: SessionState = {
      ...createInitialTableState('s3', 'HOLDEM', 100, 1),
      players: ['u1', 'u2'],
      stacks: { u1: 10, u2: 10 },
      street: 'RIVER',
      phase: 'RIVER',
      foldedPlayerIds: [],
      playerRoundBet: { u1: 0, u2: 0 },
      communityCards: ['AS', 'KH', 'QD', 'JC', '9H'],
      playerCards: {
        u1: ['TS', '8S'],
        u2: ['TD', '8D']
      },
      pot: 200,
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
      sessionId: 's3',
      mode: 'HOLDEM',
      allInPlayerIds: [],
      actedThisRound: { u1: true, u2: true },
      handContributions: { u1: 100, u2: 100 },
      readyForNextHand: []
    };
    const r = applyTableAction(state, { sessionId: 's3', userId: 'u1', type: 'check', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('COMPLETE');
    expect(r.state.winners?.sort()).toEqual(['u1', 'u2']);
    expect(r.state.winnersShare?.u1).toBe(100);
    expect(r.state.winnersShare?.u2).toBe(100);
  });
});

describe('Joker flow', () => {
  it('runs bidding and one trick then completes', () => {
    let s = createInitialTableState('sr', 'JOKER', 100, 7);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    expect(s.street).toBe('BIDDING');
    expect(s.playerCards.a?.length).toBe(1);
    expect(s.joker?.cardsThisDeal).toBe(1);

    const bidA = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'sr', userId: bidA, type: 'bid', amount: 0, at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.street).toBe('BIDDING');

    const bidB = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'sr', userId: bidB, type: 'bid', amount: 0, at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.street).toBe('TRICKS');

    const play1 = s.players[s.activePlayerIndex]!;
    const card1 = s.playerCards[play1]![0]!;
    r = applyTableAction(s, { sessionId: 'sr', userId: play1, type: 'playCard', card: card1, at: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const play2 = s.players[s.activePlayerIndex]!;
    const card2 = s.playerCards[play2]![0]!;
    r = applyTableAction(s, { sessionId: 'sr', userId: play2, type: 'playCard', card: card2, at: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('COMPLETE');
    expect(r.state.mode).toBe('JOKER');
    expect(r.state.joker?.handPoints).toBeDefined();
  });

  it('allows joker when holding suit cards', () => {
    let s = createInitialTableState('sr', 'JOKER', 100, 99);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 },
      handNumber: 7
    });
    s = {
      ...s,
      street: 'TRICKS',
      playerCards: { a: ['7S', '6S'], b: ['8H'] },
      joker: {
        ...s.joker!,
        bids: { a: 0, b: 0 },
        trumpSuit: 'H',
        currentTrick: [{ userId: 'b', card: 'TH' }],
        cardsThisDeal: 2
      },
      activePlayerIndex: 0,
      activePlayerId: 'a'
    };
    const r = applyTableAction(s, {
      sessionId: 'sr',
      userId: 'a',
      type: 'playCard',
      card: '6S',
      at: 1
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.playerCards.a).toEqual(['7S']);
  });
});

describe('markReadyForNextHand', () => {
  it('requires all players ready before dealing', () => {
    const complete: SessionState = {
      ...baseHand(),
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      readyForNextHand: []
    };
    let r = markReadyForNextHand(complete, 'u1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.started).toBe(false);
    expect(r.state.readyForNextHand).toContain('u1');

    r = markReadyForNextHand(r.state, 'u2');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.started).toBe(true);
    expect(r.state.street).toBe('PREFLOP');
  });

  it('starts next hand when the only human is ready and bots auto-ready', () => {
    const complete: SessionState = {
      ...baseHand(),
      players: ['u1', 'duopoker-bot-1'],
      stacks: { u1: 100, 'duopoker-bot-1': 100 },
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      readyForNextHand: []
    };
    const r = markReadyForNextHand(complete, 'u1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.started).toBe(true);
    expect(r.state.street).toBe('PREFLOP');
  });
});
