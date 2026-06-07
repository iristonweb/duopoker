import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import {
  addPlayerToTable,
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

describe('applyTableAction — raise amount', () => {
  it('logs raiseBy as increment and amount as chips paid', () => {
    let state = baseHand();
    const sb = state.players[state.activePlayerIndex]!;
    const bb = state.players.find((p) => p !== sb)!;

    let r = applyTableAction(state, { sessionId: 's1', userId: sb, type: 'call', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    state = r.state;

    r = applyTableAction(state, { sessionId: 's1', userId: bb, type: 'raise', amount: 4, at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const last = r.state.actionLog[r.state.actionLog.length - 1];
    expect(last?.type).toBe('raise');
    expect(last?.raiseBy).toBeGreaterThan(0);
    expect(last?.amount).toBeGreaterThan(0);
    expect(last!.raiseBy!).toBeLessThanOrEqual(last!.amount! + (state.bigBlind ?? 2));
  });

  it('bumps sub-minimum raise request up to lastRaiseSize', () => {
    let state = baseHand();
    const sb = state.players[state.activePlayerIndex]!;
    const bb = state.players.find((p) => p !== sb)!;
    const minRaise = state.lastRaiseSize ?? state.bigBlind;

    let r = applyTableAction(state, { sessionId: 's1', userId: sb, type: 'call', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    state = r.state;

    r = applyTableAction(state, { sessionId: 's1', userId: bb, type: 'raise', amount: 1, at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const last = r.state.actionLog[r.state.actionLog.length - 1];
    expect(last?.raiseBy).toBeGreaterThanOrEqual(minRaise);
  });

  it('updates lastRaiseSize on full raise', () => {
    let state = baseHand();
    const sb = state.players[state.activePlayerIndex]!;
    const bb = state.players.find((p) => p !== sb)!;

    let r = applyTableAction(state, { sessionId: 's1', userId: sb, type: 'call', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    state = r.state;

    r = applyTableAction(state, { sessionId: 's1', userId: bb, type: 'raise', amount: 4, at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.lastRaiseSize).toBeGreaterThanOrEqual(state.bigBlind ?? 2);
  });
});

describe('applyTableAction — ILLEGAL_RAISE', () => {
  it('rejects raise when player cannot put any chips in', () => {
    let state = baseHand();
    const actor = state.players[state.activePlayerIndex]!;
    state = {
      ...state,
      stacks: { ...state.stacks, [actor]: 0 },
      allInPlayerIds: [...(state.allInPlayerIds ?? []), actor]
    };
    const r = applyTableAction(state, {
      sessionId: 's1',
      userId: actor,
      type: 'raise',
      amount: 4,
      at: 1
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('ALL_IN');
  });

  it('allows short-stack re-raise that only calls when below min increment', () => {
    let s = createInitialTableState('short', 'HOLDEM', 100, 77);
    s = startNewHand({
      ...s,
      players: ['u0', 'u1', 'u2'],
      stacks: { u0: 200, u1: 200, u2: 8 }
    });

    const utg = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'short', userId: utg, type: 'raise', amount: 10, at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const mp = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'short', userId: mp, type: 'call', at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const short = s.players[s.activePlayerIndex]!;
    expect(short).toBe('u2');
    r = applyTableAction(s, { sessionId: 'short', userId: short, type: 'raise', amount: 20, at: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.stacks[short]).toBe(0);
    expect(r.state.allInPlayerIds).toContain(short);
  });
});

describe('applyTableAction — short all-in no reopen', () => {
  it('closes preflop without reopening for raiser after short all-in call', () => {
    let s = createInitialTableState('reopen', 'HOLDEM', 100, 50);
    s = startNewHand({
      ...s,
      players: ['u0', 'u1', 'u2'],
      stacks: { u0: 200, u1: 200, u2: 15 }
    });

    const utg = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'reopen', userId: utg, type: 'raise', amount: 18, at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const next1 = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'reopen', userId: next1, type: 'call', at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const short = s.players[s.activePlayerIndex]!;
    expect(short).toBe('u2');
    r = applyTableAction(s, { sessionId: 'reopen', userId: short, type: 'call', at: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('FLOP');
    expect(r.state.allInPlayerIds).toContain('u2');
  });

  it('advances through chained short all-ins without reopening the original raiser', () => {
    let s = createInitialTableState('chain', 'HOLDEM', 100, 51);
    s = startNewHand({
      ...s,
      players: ['u0', 'u1', 'u2', 'u3'],
      stacks: { u0: 200, u1: 12, u2: 8, u3: 200 }
    });

    const utg = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'chain', userId: utg, type: 'raise', amount: 20, at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const caller1 = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'chain', userId: caller1, type: 'call', at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const short1 = s.players[s.activePlayerIndex]!;
    expect(short1).toBe('u1');
    r = applyTableAction(s, { sessionId: 'chain', userId: short1, type: 'call', at: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;
    expect(s.allInPlayerIds).toContain('u1');

    const short2 = s.players[s.activePlayerIndex]!;
    expect(short2).toBe('u2');
    r = applyTableAction(s, { sessionId: 'chain', userId: short2, type: 'call', at: 4 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('FLOP');
    expect(r.state.allInPlayerIds).toEqual(expect.arrayContaining(['u1', 'u2']));
  });
});

describe('applyTableAction — call amount', () => {
  it('logs call amount in actionLog', () => {
    const state = baseHand();
    const actor = state.players[state.activePlayerIndex]!;
    const r = applyTableAction(state, { sessionId: 's1', userId: actor, type: 'call', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const last = r.state.actionLog[r.state.actionLog.length - 1];
    expect(last?.type).toBe('call');
    expect(last?.amount).toBeGreaterThan(0);
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

describe('addPlayerToTable — JOKER seating', () => {
  it('caps JOKER tables at four players', () => {
    let s = createInitialTableState('j4', 'JOKER', 100, 1);
    for (let i = 0; i < 5; i += 1) {
      s = addPlayerToTable(s, `p${i}`);
    }
    expect(s.players).toHaveLength(4);
  });
});

describe('applyTableAction — multi side pots', () => {
  it('awards separate main and side pots at showdown', () => {
    const state: SessionState = {
      ...createInitialTableState('pots', 'HOLDEM', 100, 9),
      players: ['a', 'b', 'c'],
      stacks: { a: 0, b: 50, c: 0 },
      street: 'RIVER',
      phase: 'RIVER',
      foldedPlayerIds: ['c'],
      playerRoundBet: { a: 0, b: 0, c: 0 },
      communityCards: ['2S', '3H', '4D', '5C', '9S'],
      playerCards: {
        a: ['AS', 'AH'],
        b: ['KS', 'KH'],
        c: ['QS', 'QH']
      },
      pot: 0,
      activePlayerIndex: 1,
      currentBet: 0,
      actionLog: [],
      deck: [],
      dealerIndex: 0,
      handNumber: 1,
      lastAggressor: 'a',
      lastRaiseSize: 2,
      buyIn: 100,
      smallBlind: 1,
      bigBlind: 2,
      sessionId: 'pots',
      mode: 'HOLDEM',
      allInPlayerIds: ['a', 'c'],
      actedThisRound: { a: true, b: true, c: true },
      handContributions: { a: 30, b: 100, c: 30 },
      readyForNextHand: []
    };
    const r = applyTableAction(state, { sessionId: 'pots', userId: 'b', type: 'check', at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('COMPLETE');
    expect((r.state.winnersShare?.a ?? 0) + (r.state.winnersShare?.b ?? 0)).toBe(160);
    expect(r.state.winnersShare?.a).toBe(90);
    expect(r.state.winnersShare?.b).toBe(70);
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
      lastRaiseSize: 2,
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
      declaration: 'nominal',
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

  it('does not start hand 25 when joker match is complete', () => {
    const complete: SessionState = {
      ...createInitialTableState('jm', 'JOKER', 100, 1),
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 },
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      handNumber: 24,
      readyForNextHand: [],
      joker: {
        matchHandIndex: 23,
        cardsThisDeal: 9,
        pool: 4,
        trumpSuit: 'H',
        bids: { a: 2, b: 3 },
        tricksWon: { a: 2, b: 3 },
        currentTrick: [],
        trickNumber: 9,
        scores: { a: 10, b: -10 }
      }
    };
    let r = markReadyForNextHand(complete, 'a');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.started).toBe(false);

    r = markReadyForNextHand(r.state, 'b');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.started).toBe(false);
    expect(r.state.handNumber).toBe(24);
    expect(r.state.street).toBe('COMPLETE');
  });
});
