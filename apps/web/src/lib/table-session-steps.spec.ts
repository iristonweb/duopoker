import { describe, expect, it } from 'vitest';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { buildTableSessionSteps, sessionSnap } from './table-session-steps';

const formatAction = (a: PlayerAction) => `${a.userId}:${a.type}`;

describe('buildTableSessionSteps — bet chip pot routing', () => {
  it('tags raise actions with side-pot index when contributions diverge', () => {
    const prev = {
      handNumber: 1,
      actionLen: 0,
      street: 'PREFLOP',
      boardLen: 0,
      jokerTrickLen: 0
    };

    const session = {
      handNumber: 1,
      street: 'PREFLOP',
      mode: 'HOLDEM',
      players: ['a', 'b', 'c'],
      foldedPlayerIds: [],
      handContributions: { a: 150, b: 50, c: 50 },
      actionLog: [
        { userId: 'a', type: 'raise', amount: 50, at: 1 },
        { userId: 'b', type: 'call', amount: 50, at: 2 },
        { userId: 'c', type: 'call', amount: 50, at: 3 },
        { userId: 'a', type: 'raise', amount: 100, at: 4 }
      ]
    } as SessionState;

    const steps = buildTableSessionSteps(prev, session, formatAction);
    const sideRaise = steps.find(
      (s) => s.kind === 'action' && s.action.type === 'raise' && s.action.at === 4
    );
    const shortCall = steps.find(
      (s) => s.kind === 'action' && s.action.type === 'call' && s.action.userId === 'b'
    );
    expect(sideRaise?.kind === 'action' && sideRaise.potIndex).toBe(1);
    expect(shortCall?.kind === 'action' && shortCall.potIndex).toBe(0);
  });
});

describe('buildTableSessionSteps — side pot winner flights', () => {
  it('emits per-pot winnerChips when multiple side pots exist', () => {
    const prev = {
      handNumber: 3,
      actionLen: 0,
      street: 'RIVER',
      boardLen: 5,
      jokerTrickLen: 0
    };

    const session = {
      handNumber: 3,
      street: 'COMPLETE',
      mode: 'HOLDEM',
      players: ['a', 'b', 'c'],
      actionLog: [] as PlayerAction[],
      foldedPlayerIds: [],
      handContributions: { a: 100, b: 50, c: 50 },
      playerCards: {
        a: ['AS', 'AH'],
        b: ['KS', 'KH'],
        c: ['QS', 'QH']
      },
      communityCards: ['2D', '3D', '4D', '5D', '9C'],
      winners: ['a', 'b'],
      winnersShare: { a: 150, b: 50 },
      pot: 0
    } as SessionState;

    const steps = buildTableSessionSteps(prev, session, formatAction);
    const wins = steps.filter((s) => s.kind === 'winnerChips');
    expect(wins.length).toBeGreaterThan(1);
    expect(wins.some((s) => s.kind === 'winnerChips' && s.potIndex === 0)).toBe(true);
    expect(wins.some((s) => s.kind === 'winnerChips' && (s.potIndex ?? 0) > 0)).toBe(true);
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
