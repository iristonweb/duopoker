import { describe, expect, it } from 'vitest';
import { applyTableAction, createInitialTableState, removePlayerFromTable, startNewHand } from './holdem-table';
import { isJokerMatchComplete } from './joker-table';

describe('Joker bid sum constraint', () => {
  it('rejects dealer bid that would make sum equal cards dealt (2 players, 1 card)', () => {
    let s = createInitialTableState('bid-sum', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    expect(s.joker?.cardsThisDeal).toBe(1);

    const first = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'bid-sum', userId: first, type: 'bid', amount: 1, at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const dealer = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'bid-sum', userId: dealer, type: 'bid', amount: 0, at: 2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('DEALER_BID_BLOCKED');

    r = applyTableAction(s, { sessionId: 'bid-sum', userId: dealer, type: 'bid', amount: 1, at: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('TRICKS');
  });
});

describe('Joker match end', () => {
  it('isJokerMatchComplete after hand 24', () => {
    const state = {
      mode: 'JOKER',
      street: 'COMPLETE',
      joker: { matchHandIndex: 23 }
    } as Parameters<typeof isJokerMatchComplete>[0];
    expect(isJokerMatchComplete(state)).toBe(true);
  });
});

describe('Joker TRUMP_CHOICE (pool 2/4)', () => {
  it('deals 3 cards then completes to 9 after chooseTrump', () => {
    let s = createInitialTableState('trump-choice', 'JOKER', 100, 88);
    s = startNewHand({
      ...s,
      players: ['a', 'b', 'c', 'd'],
      stacks: { a: 100, b: 100, c: 100, d: 100 },
      handNumber: 8
    });
    expect(s.street).toBe('TRUMP_CHOICE');
    expect(s.joker?.cardsThisDeal).toBe(9);
    expect(s.joker?.pool).toBe(2);
    for (const p of s.players) {
      expect(s.playerCards[p]?.length).toBe(3);
    }

    const chooser = s.players[s.activePlayerIndex]!;
    const r = applyTableAction(s, {
      sessionId: 'trump-choice',
      userId: chooser,
      type: 'chooseTrump',
      trumpSuit: 'H',
      at: 1
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('BIDDING');
    expect(r.state.joker?.trumpSuit).toBe('H');
    for (const p of r.state.players) {
      expect(r.state.playerCards[p]?.length).toBe(9);
    }
    if (r.state.joker?.trumpCard) {
      expect(r.state.communityCards).toContain(r.state.joker.trumpCard);
    }
  });
});

describe('Joker declaration required', () => {
  it('rejects joker play without declaration', () => {
    let s = createInitialTableState('decl', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    s = {
      ...s,
      street: 'TRICKS',
      playerCards: { a: ['6S', '7H'], b: ['8H'] },
      joker: {
        ...s.joker!,
        bids: { a: 0, b: 0 },
        trumpSuit: 'H',
        currentTrick: [],
        cardsThisDeal: 2
      },
      activePlayerIndex: 0,
      activePlayerId: 'a'
    };
    const r = applyTableAction(s, {
      sessionId: 'decl',
      userId: 'a',
      type: 'playCard',
      card: '6S',
      at: 1
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('JOKER_DECLARATION_REQUIRED');
  });
});

describe('Joker nominal trump ban', () => {
  it('rejects nominal joker after void dump in no-trump', () => {
    let s = createInitialTableState('nom', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    s = {
      ...s,
      street: 'TRICKS',
      playerCards: { a: ['6S', '7H'], b: ['8H'] },
      joker: {
        ...s.joker!,
        bids: { a: 0, b: 0 },
        trumpSuit: null,
        currentTrick: [],
        cardsThisDeal: 2,
        voidTrumpDiscards: true
      },
      activePlayerIndex: 0,
      activePlayerId: 'a'
    };
    const r = applyTableAction(s, {
      sessionId: 'nom',
      userId: 'a',
      type: 'playCard',
      card: '6S',
      declaration: 'nominal',
      at: 1
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('NOMINAL_TRUMP_BANNED');
  });
});

describe('Joker suit-force lead', () => {
  it('requires followers to play forced suit after joker suit declaration', () => {
    let s = createInitialTableState('force', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    s = {
      ...s,
      street: 'TRICKS',
      playerCards: { a: ['6S'], b: ['7H', '8D'] },
      joker: {
        ...s.joker!,
        bids: { a: 0, b: 0 },
        trumpSuit: null,
        currentTrick: [{ userId: 'a', card: '6S', declaration: { suit: 'H', rankMode: 'senior' } }],
        cardsThisDeal: 1,
        trickNumber: 0
      },
      activePlayerIndex: 1,
      activePlayerId: 'b'
    };
    const illegal = applyTableAction(s, {
      sessionId: 'force',
      userId: 'b',
      type: 'playCard',
      card: '8D',
      at: 1
    });
    expect(illegal.ok).toBe(false);

    const legal = applyTableAction(s, {
      sessionId: 'force',
      userId: 'b',
      type: 'playCard',
      card: '7H',
      at: 1
    });
    expect(legal.ok).toBe(true);
  });
});

describe('Joker strict rules', () => {
  it('blocks leading with joker when strict and non-jokers remain', () => {
    let s = createInitialTableState('strict', 'JOKER', 100, 42, { strictJoker: true });
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    s = {
      ...s,
      street: 'TRICKS',
      playerCards: { a: ['7S', '6S'], b: ['8H'] },
      joker: {
        ...s.joker!,
        bids: { a: 0, b: 0 },
        trumpSuit: 'H',
        currentTrick: [],
        cardsThisDeal: 2
      },
      activePlayerIndex: 0,
      activePlayerId: 'a'
    };
    const r = applyTableAction(s, {
      sessionId: 'strict',
      userId: 'a',
      type: 'playCard',
      card: '6S',
      declaration: 'senior',
      at: 1
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe('ILLEGAL_CARD');
  });
});

describe('Joker tuzovanieLog', () => {
  it('stores chronological tuzovanie log on first hand', () => {
    const s = startNewHand({
      ...createInitialTableState('tuz', 'JOKER', 100, 99),
      players: ['a', 'b', 'c', 'd'],
      stacks: { a: 100, b: 100, c: 100, d: 100 },
      handNumber: 0
    });
    expect(s.joker?.tuzovanieLog?.length).toBeGreaterThan(0);
    expect(s.joker?.tuzovanieLog?.[0]?.userId).toBeDefined();
  });
});

describe('Joker no-trump reveal', () => {
  it('sets trumpSuit null when trump card is a joker', () => {
    let s = createInitialTableState('no-trump', 'JOKER', 100, 99);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 },
      handNumber: 5
    });
    if (s.joker?.trumpCard && (s.joker.trumpCard === '6S' || s.joker.trumpCard === '6C')) {
      expect(s.joker.trumpSuit).toBeNull();
    } else if (s.joker?.trumpCard) {
      expect(s.joker.trumpSuit).not.toBeNull();
    }
  });
});

describe('Joker suit-force void dump', () => {
  it('flags voidTrumpDiscards after off-suit follow to suit-force lead', () => {
    let s = createInitialTableState('force-void', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    s = {
      ...s,
      street: 'TRICKS',
      playerCards: { a: ['9C'], b: ['8D'] },
      joker: {
        ...s.joker!,
        bids: { a: 0, b: 0 },
        trumpSuit: null,
        currentTrick: [{ userId: 'a', card: '6S', declaration: { suit: 'H', rankMode: 'senior' } }],
        cardsThisDeal: 2,
        trickNumber: 0,
        voidTrumpDiscards: false
      },
      activePlayerIndex: 1,
      activePlayerId: 'b'
    };
    const r = applyTableAction(s, {
      sessionId: 'force-void',
      userId: 'b',
      type: 'playCard',
      card: '8D',
      at: 1
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.joker?.voidTrumpDiscards).toBe(true);
    expect(r.state.joker?.currentTrick).toEqual([]);
  });
});

describe('Joker deal order', () => {
  it('deals first hole card to the seat left of the dealer', () => {
    const base = {
      ...createInitialTableState('deal-j', 'JOKER', 100, 7),
      players: ['a', 'b', 'c', 'd'],
      stacks: { a: 100, b: 100, c: 100, d: 100 },
      handNumber: 1
    };
    const fromDealer0 = startNewHand({ ...base, dealerIndex: 3 });
    const fromDealer1 = startNewHand({ ...base, dealerIndex: 0 });
    expect(fromDealer0.dealerIndex).toBe(0);
    expect(fromDealer1.dealerIndex).toBe(1);
    expect(fromDealer0.playerCards.b?.[0]).toBe(fromDealer1.playerCards.c?.[0]);
  });
});

describe('Joker leave mid-hand', () => {
  it('aborts the deal to LOBBY without stalling', () => {
    let s = createInitialTableState('leave-j', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b', 'c', 'd'],
      stacks: { a: 100, b: 100, c: 100, d: 100 }
    });
    expect(s.street).not.toBe('LOBBY');
    const r = removePlayerFromTable(s, 'b');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('LOBBY');
    expect(r.state.players).not.toContain('b');
    expect(r.state.joker?.currentTrick).toEqual([]);
  });
});
