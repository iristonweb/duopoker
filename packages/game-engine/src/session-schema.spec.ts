import { describe, expect, it } from 'vitest';
import { parseLoadedSessionState, sessionStateSchema } from './session-schema';
import type { SessionState } from '@duopoker/shared-types/index';

describe('sessionStateSchema', () => {
  it('accepts minimal holdem snapshot', () => {
    const raw = {
      sessionId: 's1',
      mode: 'HOLDEM',
      players: ['a', 'b'],
      handNumber: 1,
      street: 'PREFLOP',
      stacks: { a: 100, b: 100 }
    };
    expect(sessionStateSchema.safeParse(raw).success).toBe(true);
    const loaded = parseLoadedSessionState(raw);
    expect(loaded?.sessionId).toBe('s1');
  });

  it('accepts joker snapshot with nested state', () => {
    const raw: Partial<SessionState> = {
      sessionId: 'j1',
      mode: 'JOKER',
      players: ['a', 'b', 'c', 'd'],
      handNumber: 3,
      street: 'BIDDING',
      stacks: { a: 0, b: 0, c: 0, d: 0 },
      joker: {
        matchHandIndex: 2,
        cardsThisDeal: 3,
        pool: 1,
        trumpSuit: 'H',
        bids: {},
        tricksWon: { a: 0, b: 0, c: 0, d: 0 },
        scores: { a: 10, b: 5, c: 0, d: 0 },
        currentTrick: [],
        trickNumber: 0,
        dealHistory: []
      }
    };
    expect(parseLoadedSessionState(raw)?.joker?.pool).toBe(1);
  });

  it('rejects invalid snapshot', () => {
    expect(parseLoadedSessionState({ bad: true })).toBeNull();
  });

  it('normalizes legacy RASPISNOY mode', () => {
    const raw = {
      sessionId: 'legacy',
      mode: 'RASPISNOY',
      players: ['a'],
      handNumber: 0,
      street: 'LOBBY',
      stacks: { a: 100 }
    };
    expect(parseLoadedSessionState(raw)?.mode).toBe('JOKER');
  });
});
