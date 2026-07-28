import { describe, expect, it } from 'vitest';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import {
  applyDisplayStep,
  buildTableSessionSteps,
  initHandDisplay,
  sessionSnap
} from '../session/table-session-steps';
import {
  amountToCall,
  computeRaiseBounds,
  isHeroActionTurn
} from '../table-derivations';

const formatAction = (a: PlayerAction) => `${a.userId}:${a.type}`;
const formatBlind = (type: 'SB' | 'BB', amount: number) => `${type} ${amount}`;

const baseHoldem = (over: Partial<SessionState> = {}): SessionState =>
  ({
    sessionId: 's1',
    mode: 'HOLDEM',
    handNumber: 1,
    street: 'PREFLOP',
    phase: 'PRE_FLOP',
    players: ['hero', 'villain', 'utg'],
    dealerIndex: 0,
    activePlayerIndex: 2,
    smallBlind: 5,
    bigBlind: 10,
    stacks: { hero: 1000, villain: 1000, utg: 1000 },
    playerRoundBet: { hero: 5, villain: 10, utg: 0 },
    playerCards: {
      hero: ['AS', 'KH'],
      villain: ['QD', 'JC'],
      utg: ['9S', '8S']
    },
    communityCards: [],
    pot: 0,
    currentBet: 10,
    foldedPlayerIds: [],
    allInPlayerIds: [],
    actionLog: [],
    actedThisRound: {},
    handContributions: { hero: 5, villain: 10, utg: 0 },
    lastRaiseSize: 10,
    seed: 1,
    ...over
  }) as SessionState;

describe('initHandDisplay + postBlind', () => {
  it('zeros holdem bets and holds active until deal completes', () => {
    const target = baseHoldem();
    const display = initHandDisplay(target, 'hero');
    expect(display.playerRoundBet).toEqual({ hero: 0, villain: 0, utg: 0 });
    expect(display.currentBet).toBe(0);
    expect(display.pot).toBe(0);
    expect(display.activePlayerIndex).toBe(-1);
  });

  it('postBlind does not move activePlayerIndex', () => {
    const target = baseHoldem();
    let display = initHandDisplay(target, 'hero');
    display = applyDisplayStep(
      display,
      target,
      { kind: 'dealHole', userId: 'hero', cardIndex: 0 },
      'hero'
    );
    display = applyDisplayStep(
      display,
      target,
      { kind: 'dealHole', userId: 'hero', cardIndex: 1 },
      'hero'
    );
    display = applyDisplayStep(
      display,
      target,
      { kind: 'dealHole', userId: 'villain', cardIndex: 0 },
      'hero'
    );
    display = applyDisplayStep(
      display,
      target,
      { kind: 'dealHole', userId: 'villain', cardIndex: 1 },
      'hero'
    );
    display = applyDisplayStep(
      display,
      target,
      { kind: 'dealHole', userId: 'utg', cardIndex: 0 },
      'hero'
    );
    display = applyDisplayStep(
      display,
      target,
      { kind: 'dealHole', userId: 'utg', cardIndex: 1 },
      'hero'
    );
    expect(display.activePlayerIndex).toBe(2);

    const afterBlind = applyDisplayStep(
      display,
      target,
      {
        kind: 'postBlind',
        userId: 'hero',
        amount: 5,
        blindType: 'SB',
        text: 'SB 5'
      },
      'hero'
    );
    expect(afterBlind.activePlayerIndex).toBe(2);
    expect(afterBlind.playerRoundBet.hero).toBe(5);
  });

  it('emits postBlind on first join when formatBlind is provided', () => {
    const session = baseHoldem();
    const steps = buildTableSessionSteps(null, session, formatAction, formatBlind);
    expect(steps.some((s) => s.kind === 'postBlind')).toBe(true);
    expect(steps.filter((s) => s.kind === 'postBlind')).toHaveLength(2);
  });
});

describe('applyDisplayStep — action active seat', () => {
  it('points at next actor until log catches up', () => {
    const target = baseHoldem({
      actionLog: [
        { userId: 'utg', type: 'check', at: 1 },
        { userId: 'hero', type: 'check', at: 2 }
      ] as PlayerAction[],
      activePlayerIndex: 1,
      playerRoundBet: { hero: 10, villain: 10, utg: 10 },
      currentBet: 10
    });
    let display = {
      ...structuredClone(target),
      actionLog: [] as PlayerAction[],
      activePlayerIndex: 2
    };

    display = applyDisplayStep(
      display,
      target,
      {
        kind: 'action',
        userId: 'utg',
        text: 'utg:check',
        action: target.actionLog[0]!
      },
      'hero'
    );
    expect(display.activePlayerIndex).toBe(0);

    display = applyDisplayStep(
      display,
      target,
      {
        kind: 'action',
        userId: 'hero',
        text: 'hero:check',
        action: target.actionLog[1]!
      },
      'hero'
    );
    expect(display.activePlayerIndex).toBe(1);
  });
});

describe('applyDisplayStep — all-in runout', () => {
  it('defers COMPLETE until board is fully dealt', () => {
    const target = baseHoldem({
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      communityCards: ['2D', '3D', '4D', '5D', '9C'],
      pot: 150,
      playerRoundBet: { hero: 0, villain: 0, utg: 0 },
      winners: ['hero'],
      winnersShare: { hero: 150 },
      activePlayerIndex: 0
    });
    let display = {
      ...structuredClone(target),
      street: 'PREFLOP' as const,
      communityCards: [] as SessionState['communityCards'],
      pot: 0,
      playerRoundBet: { hero: 50, villain: 50, utg: 50 },
      winners: undefined
    };

    display = applyDisplayStep(display, target, { kind: 'collectBets' }, 'hero');
    expect(display.street).toBe('PREFLOP');
    expect(display.winners).toBeUndefined();

    for (let i = 0; i < 5; i++) {
      display = applyDisplayStep(display, target, { kind: 'dealBoard', cardIndex: i }, 'hero');
    }
    expect(display.communityCards).toHaveLength(5);
    expect(display.street).not.toBe('COMPLETE');

    display = applyDisplayStep(display, target, { kind: 'potPulse' }, 'hero');
    expect(display.street).toBe('COMPLETE');
    expect(display.winners).toEqual(['hero']);
  });

  it('syncs activePlayerIndex on collectBets for street advance', () => {
    const target = baseHoldem({
      street: 'FLOP',
      phase: 'FLOP',
      communityCards: ['2D', '3D', '4D'],
      playerRoundBet: { hero: 0, villain: 0, utg: 0 },
      currentBet: 0,
      pot: 30,
      activePlayerIndex: 0
    });
    let display = {
      ...structuredClone(target),
      street: 'PREFLOP' as const,
      communityCards: [] as SessionState['communityCards'],
      pot: 0,
      playerRoundBet: { hero: 10, villain: 10, utg: 10 },
      activePlayerIndex: 2
    };

    display = applyDisplayStep(display, target, { kind: 'collectBets' }, 'hero');
    expect(display.street).toBe('FLOP');
    expect(display.activePlayerIndex).toBe(0);
    expect(display.playerRoundBet).toEqual({ hero: 0, villain: 0, utg: 0 });
  });
});

describe('isHeroActionTurn', () => {
  it('is false while display active lags server', () => {
    const session = baseHoldem({ activePlayerIndex: 2 });
    expect(
      isHeroActionTurn({
        session,
        heroId: 'utg',
        displayActiveId: 'hero'
      })
    ).toBe(false);
  });

  it('is true when server and display agree on hero', () => {
    const session = baseHoldem({
      activePlayerIndex: 0,
      playerRoundBet: { hero: 10, villain: 10, utg: 10 },
      currentBet: 10
    });
    expect(amountToCall(session, 'hero')).toBe(0);
    expect(
      isHeroActionTurn({
        session,
        heroId: 'hero',
        displayActiveId: 'hero'
      })
    ).toBe(true);
  });

  it('is false on COMPLETE', () => {
    const session = baseHoldem({ street: 'COMPLETE', activePlayerIndex: 0 });
    expect(
      isHeroActionTurn({
        session,
        heroId: 'hero',
        displayActiveId: 'hero'
      })
    ).toBe(false);
  });
});

describe('computeRaiseBounds', () => {
  it('uses lastRaiseSize when set', () => {
    const session = baseHoldem({
      lastRaiseSize: 40,
      bigBlind: 10,
      playerRoundBet: { hero: 0, villain: 0, utg: 0 },
      currentBet: 0,
      activePlayerIndex: 0
    });
    const bounds = computeRaiseBounds(session, 'hero');
    expect(bounds.need).toBe(0);
    expect(bounds.minTotal).toBe(40);
  });
});

describe('sessionSnap', () => {
  it('tracks joker trick length separately from board', () => {
    const snap = sessionSnap({
      mode: 'JOKER',
      street: 'TRICKS',
      handNumber: 1,
      actionLog: [],
      communityCards: [],
      joker: { currentTrick: [{ userId: 'a', card: '7S' }] }
    } as SessionState);
    expect(snap.jokerTrickLen).toBe(1);
    expect(snap.boardLen).toBe(1);
  });
});
