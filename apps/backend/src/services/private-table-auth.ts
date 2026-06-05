import { prisma } from './prisma.js';

export const getPrivateTableBySessionId = async (sessionId: string) =>
  prisma.privateTable.findUnique({
    where: { sessionId },
    include: { club: { select: { id: true, isArchived: true } } }
  });

export const canJoinPrivateSession = async (
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  if (userId.startsWith('guest-')) {
    return { ok: false, reason: 'GUEST_NOT_ALLOWED' };
  }

  const table = await getPrivateTableBySessionId(sessionId);
  if (!table) return { ok: true };

  if (table.club.isArchived || table.status === 'CLOSED') {
    return { ok: false, reason: 'TABLE_CLOSED' };
  }

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: table.clubId, userId } }
  });
  if (!membership) {
    return { ok: false, reason: 'CLUB_MEMBERSHIP_REQUIRED' };
  }

  const isAdmin =
    membership.role === 'OWNER' || membership.role === 'ADMIN' || table.hostUserId === userId;

  const seat = await prisma.privateTableSeat.findUnique({
    where: { tableId_userId: { tableId: table.id, userId } }
  });

  if (isAdmin) return { ok: true };
  if (!seat || (seat.status !== 'ACCEPTED' && seat.status !== 'SEATED')) {
    return { ok: false, reason: 'INVITE_REQUIRED' };
  }

  return { ok: true };
};

export const getSessionPlayerProfiles = async (userIds: string[]) => {
  if (!userIds.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, displayName: true, avatar: true }
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return userIds.map((id) => {
    const u = byId.get(id);
    return {
      userId: id,
      nickname: u?.nickname ?? null,
      displayName: u?.displayName ?? id.slice(0, 8),
      avatar: u?.avatar ?? null
    };
  });
};
