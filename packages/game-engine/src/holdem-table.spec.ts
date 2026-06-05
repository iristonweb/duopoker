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

describe('Raspisnoy flow', () => {
  it('deals five cards and completes after one betting round', () => {
    let s = createInitialTableState('sr', 'RASPISNOY', 100, 7);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    expect(s.playerCards.a?.length).toBe(5);
    expect(s.playerCards.b?.length).toBe(5);
    expect(s.pot).toBeGreaterThan(0);

    const first = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'sr', userId: first, type: 'check', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    const second = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'sr', userId: second, type: 'check', at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('COMPLETE');
    expect(r.state.mode).toBe('RASPISNOY');
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
});
