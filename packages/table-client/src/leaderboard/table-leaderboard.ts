import type { SessionState } from '@duopoker/shared-types/index';

export type TableLeaderboardEntry = {
  userId: string;
  rank: number;
  score: number;
  handDelta?: number;
  isTied?: boolean;
};

function scoreForPlayer(session: SessionState, userId: string): number {
  if (session.mode === 'JOKER') {
    return session.joker?.scores[userId] ?? 0;
  }
  return session.stacks[userId] ?? 0;
}

function handDeltaForPlayer(session: SessionState, userId: string): number | undefined {
  if (session.mode === 'JOKER') {
    const pts = session.joker?.handPoints?.[userId];
    return pts !== undefined ? pts : undefined;
  }
  if (session.street === 'COMPLETE' && session.winnersShare) {
    const share = session.winnersShare[userId];
    return share !== undefined ? share : undefined;
  }
  return undefined;
}

/** Build a ranked leaderboard for all seated players in the current session. */
export function buildTableLeaderboard(session: SessionState): TableLeaderboardEntry[] {
  const rows = session.players.map((userId) => ({
    userId,
    score: scoreForPlayer(session, userId),
    handDelta: handDeltaForPlayer(session, userId)
  }));

  rows.sort((a, b) => b.score - a.score || a.userId.localeCompare(b.userId));

  let rank = 0;
  let prevScore: number | null = null;
  let tiedWithPrev = false;

  return rows.map((row, index) => {
    if (prevScore === null || row.score !== prevScore) {
      rank = index + 1;
      tiedWithPrev = false;
    } else {
      tiedWithPrev = true;
    }
    prevScore = row.score;

    const nextScore = rows[index + 1]?.score;
    const isTied = tiedWithPrev || (nextScore !== undefined && nextScore === row.score);

    return {
      userId: row.userId,
      rank,
      score: row.score,
      handDelta: row.handDelta,
      isTied: isTied || undefined
    };
  });
}

/** User ids tied for first place (empty if no players). */
export function leaderboardLeaders(session: SessionState): string[] {
  const board = buildTableLeaderboard(session);
  if (!board.length) return [];
  const topRank = board[0]!.rank;
  return board.filter((e) => e.rank === topRank).map((e) => e.userId);
}

/** Stable key for detecting leader changes in the game feed. */
export function leaderboardFeedKey(session: SessionState): string {
  return leaderboardLeaders(session).sort().join(',');
}
