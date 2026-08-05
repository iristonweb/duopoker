import { randomUUID } from 'node:crypto';
import { canJoinPrivateSession, getPrivateTableBySessionId } from './private-table-auth.js';
import { getSessionSnapshot } from './game-session.js';
import { loadGameSnapshot } from './session-persistence.js';
import { prisma } from './prisma.js';
import { config } from '../config.js';

/** Verify user is allowed to join a session (matchmaking assignment, club seat, or rejoin). */
export const assertCanJoinSession = async (
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  // Dev/E2E open-join escapes — never in production. Checked before DB so a
  // transient Prisma failure cannot block ALLOW_OPEN_JOIN / e2e-* sessions.
  if (!config.isProduction) {
    if (sessionId.startsWith('e2e-') || process.env.ALLOW_OPEN_JOIN === 'true') {
      return { ok: true };
    }
    if (!process.env.DATABASE_URL) {
      return { ok: true };
    }
  }

  let snapshot: Awaited<ReturnType<typeof loadGameSnapshot>> = null;
  try {
    snapshot = await loadGameSnapshot(sessionId);
  } catch {
    snapshot = null;
  }
  if (snapshot?.players.includes(userId)) return { ok: true };

  const assignment = await prisma.matchAssignment.findUnique({ where: { userId } });
  if (assignment?.sessionId === sessionId) return { ok: true };

  const table = await getPrivateTableBySessionId(sessionId);
  if (table) return canJoinPrivateSession(sessionId, userId);

  const vipInvite = await prisma.platformDuelInvite.findFirst({
    where: {
      userId,
      status: 'ACCEPTED',
      duel: { sessionId, status: 'LIVE' }
    }
  });
  if (vipInvite) return { ok: true };

  return { ok: false, reason: 'NOT_ASSIGNED' };
};

export const assertVoiceSessionAccess = assertCanJoinSession;

/** Verify user is seated at an active table session. */
export const assertSeatedInSession = async (
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  let snapshot: Awaited<ReturnType<typeof getSessionSnapshot>> = null;
  try {
    snapshot = await getSessionSnapshot(sessionId);
  } catch {
    snapshot = null;
  }
  if (!snapshot) return { ok: false, reason: 'SESSION_NOT_FOUND' };
  if (!snapshot.players.includes(userId)) return { ok: false, reason: 'NOT_SEATED' };
  return { ok: true };
};

export const newSessionId = (prefix = 'sess'): string => `${prefix}-${randomUUID()}`;
