import { randomUUID } from 'node:crypto';
import { canJoinPrivateSession, getPrivateTableBySessionId } from './private-table-auth.js';
import { loadGameSnapshot } from './session-persistence.js';
import { prisma } from './prisma.js';

/** Verify user is allowed to join a session (matchmaking assignment, club seat, or rejoin). */
export const assertCanJoinSession = async (
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  const snapshot = await loadGameSnapshot(sessionId);
  if (snapshot?.players.includes(userId)) return { ok: true };

  const assignment = await prisma.matchAssignment.findUnique({ where: { userId } });
  if (assignment?.sessionId === sessionId) return { ok: true };

  const table = await getPrivateTableBySessionId(sessionId);
  if (table) return canJoinPrivateSession(sessionId, userId);

  return { ok: false, reason: 'NOT_ASSIGNED' };
};

export const newSessionId = (prefix = 'sess'): string => `${prefix}-${randomUUID()}`;
