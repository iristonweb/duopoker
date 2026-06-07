import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import { buildTableLeaderboard, leaderboardFeedKey, leaderboardLeaders } from './table-leaderboard';

const baseSession = (overrides: Partial<SessionState> = {}): SessionState =>
  ({
    sessionId: 's1',
    mode: 'HOLDEM',
    phase: 'PLAYING',
    street: 'FLOP',
    pot: 100,
    buyIn: 1000,
    smallBlind: 5,
    bigBlind: 10,
    seed: 1,
    handNumber: 3,
    players: ['a', 'b', 'c'],
    dealerIndex: 0,
    activePlayerIndex: 1,
    currentBet: 20,
    playerRoundBet: {},
    communityCards: [],
    playerCards: {},
    stacks: { a: 1200, b: 800, c: 1000 },
    foldedPlayerIds: [],
    actionLog: [],
    deck: [],
    lastAggressor: null,
    lastRaiseSize: 10,
    allInPlayerIds: [],
    actedThisRound: {},
    handContributions: {},
    readyForNextHand: [],
    ...overrides
  }) as SessionState;

describe('buildTableLeaderboard', () => {
  it('returns empty for no players', () => {
    expect(buildTableLeaderboard(baseSession({ players: [], stacks: {} }))).toEqual([]);
  });

  it('sorts holdem by stacks descending', () => {
    const board = buildTableLeaderboard(baseSession());
    expect(board.map((e) => e.userId)).toEqual(['a', 'c', 'b']);
    expect(board[0]).toMatchObject({ rank: 1, score: 1200 });
    expect(board[1]).toMatchObject({ rank: 2, score: 1000 });
    expect(board[2]).toMatchObject({ rank: 3, score: 800 });
  });

  it('handles tied scores with shared rank', () => {
    const board = buildTableLeaderboard(
      baseSession({ stacks: { a: 1000, b: 1000, c: 500 }, players: ['a', 'b', 'c'] })
    );
    expect(board[0]!.rank).toBe(1);
    expect(board[1]!.rank).toBe(1);
    expect(board[0]!.isTied).toBe(true);
    expect(board[1]!.isTied).toBe(true);
    expect(board[2]!.rank).toBe(3);
  });

  it('sorts joker by cumulative scores', () => {
    const board = buildTableLeaderboard(
      baseSession({
        mode: 'JOKER',
        street: 'TRICKS',
        stacks: { a: 1000, b: 1000, c: 1000 },
        joker: {
          matchHandIndex: 5,
          pool: 2,
          cardsThisDeal: 6,
          trumpSuit: 'H',
          scores: { a: 45, b: 60, c: 30 },
          handPoints: { a: 5, b: -2, c: 10 },
          bids: {},
          tricksWon: {},
          trickNumber: 1,
          currentTrick: [],
          dealerIndex: 0
        } as SessionState['joker']
      })
    );
    expect(board.map((e) => e.userId)).toEqual(['b', 'a', 'c']);
    expect(board[0]).toMatchObject({ score: 60, handDelta: -2 });
  });

  it('includes holdem hand delta from winnersShare on complete', () => {
    const board = buildTableLeaderboard(
      baseSession({
        street: 'COMPLETE',
        winnersShare: { a: 150, b: 0, c: 0 }
      })
    );
    expect(board.find((e) => e.userId === 'a')?.handDelta).toBe(150);
  });
});

describe('leaderboardLeaders', () => {
  it('returns all tied leaders', () => {
    const leaders = leaderboardLeaders(
      baseSession({ stacks: { a: 900, b: 900, c: 400 }, players: ['a', 'b', 'c'] })
    );
    expect(leaders.sort()).toEqual(['a', 'b']);
  });
});

describe('leaderboardFeedKey', () => {
  it('changes when the table leader changes', () => {
    const before = baseSession({ stacks: { a: 1200, b: 800, c: 1000 } });
    const after = baseSession({ stacks: { a: 700, b: 1500, c: 1000 } });
    expect(leaderboardFeedKey(before)).toBe('a');
    expect(leaderboardFeedKey(after)).toBe('b');
    expect(leaderboardFeedKey(before)).not.toBe(leaderboardFeedKey(after));
  });

  it('is stable for tied leaders regardless of order', () => {
    const session = baseSession({ stacks: { a: 900, b: 900, c: 400 }, players: ['a', 'b', 'c'] });
    expect(leaderboardFeedKey(session)).toBe('a,b');
  });
});
