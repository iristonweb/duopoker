import { normalizeNicknameInput } from '../lib/nickname.js';
import { prisma } from '../lib/prisma.js';
import { recordMatchForPlayers, createVipSession } from './game-session.js';
import { notifyVipInvite, notifyVipTableLive } from './notifications/dispatch.js';

const VIP_EXPIRY_MS = 1000 * 60 * 60 * 2;

export const resolveNicknamesToUsers = async (nicknames: string[]) => {
  const normalized = [...new Set(nicknames.map((n) => normalizeNicknameInput(n)).filter(Boolean))];
  const users = await prisma.user.findMany({
    where: { nickname: { in: normalized } },
    select: { id: true, nickname: true, displayName: true }
  });
  const found = new Set(users.map((u) => u.nickname));
  const missing = normalized.filter((n) => !found.has(n));
  return { users, missing };
};

export const createVipTableInvite = async (
  hostId: string,
  opts: {
    nicknames: string[];
    mode: 'HOLDEM' | 'JOKER';
    buyIn: number;
    message?: string;
  }
) => {
  const { users, missing } = await resolveNicknamesToUsers(opts.nicknames);
  if (missing.length) {
    return { ok: false as const, error: 'PLAYERS_NOT_FOUND', missing };
  }
  if (users.some((u) => u.id === hostId)) {
    return { ok: false as const, error: 'HOST_IN_LIST' };
  }
  if (users.length < 1) {
    return { ok: false as const, error: 'NEED_AT_LEAST_ONE_PLAYER' };
  }
  if (users.length > 5) {
    return { ok: false as const, error: 'MAX_FIVE_INVITES' };
  }

  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { displayName: true, nickname: true }
  });

  const duel = await prisma.platformDuel.create({
    data: {
      hostId,
      message: opts.message?.trim() || null,
      mode: opts.mode,
      buyIn: opts.buyIn,
      expiresAt: new Date(Date.now() + VIP_EXPIRY_MS),
      invites: {
        create: [
          {
            userId: hostId,
            status: 'ACCEPTED',
            respondedAt: new Date()
          },
          ...users.map((u) => ({
            userId: u.id,
            status: 'PENDING' as const
          }))
        ]
      }
    },
    include: {
      invites: {
        include: {
          user: { select: { id: true, nickname: true, displayName: true } }
        }
      }
    }
  });

  void notifyVipInvite(
    users.map((u) => u.id),
    {
      hostName: host?.displayName ?? 'Admin',
      hostNick: host?.nickname ?? 'admin',
      mode: opts.mode,
      buyIn: opts.buyIn,
      message: opts.message
    }
  );

  return {
    ok: true as const,
    duel,
    host: host ?? { displayName: 'Admin', nickname: 'admin' }
  };
};

export const listAdminVipTables = async (hostId: string) =>
  prisma.platformDuel.findMany({
    where: { hostId, status: { in: ['PENDING', 'LIVE'] } },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      invites: {
        include: {
          user: { select: { id: true, nickname: true, displayName: true } }
        }
      }
    }
  });

const listPendingVipInvites = async (userId: string) =>
  prisma.platformDuelInvite.findMany({
    where: {
      userId,
      status: 'PENDING',
      duel: { status: 'PENDING', expiresAt: { gt: new Date() } }
    },
    orderBy: { duel: { createdAt: 'desc' } },
    include: {
      duel: {
        include: {
          host: { select: { id: true, displayName: true, nickname: true } }
        }
      }
    }
  });

export const getUserVipNotifications = async (userId: string) => {
  const [pending, liveInvite] = await Promise.all([
    listPendingVipInvites(userId),
    prisma.platformDuelInvite.findFirst({
      where: {
        userId,
        status: 'ACCEPTED',
        duel: { status: 'LIVE', sessionId: { not: null } }
      },
      include: {
        duel: {
          include: { host: { select: { id: true, displayName: true, nickname: true } } }
        }
      },
      orderBy: { duel: { startedAt: 'desc' } }
    })
  ]);

  return {
    pending,
    live:
      liveInvite?.duel.sessionId && liveInvite.duel
        ? {
            duelId: liveInvite.duelId,
            sessionId: liveInvite.duel.sessionId,
            mode: liveInvite.duel.mode,
            buyIn: liveInvite.duel.buyIn,
            host: liveInvite.duel.host
          }
        : null
  };
};

export const respondVipInvite = async (
  userId: string,
  duelId: string,
  accept: boolean
) => {
  const invite = await prisma.platformDuelInvite.findUnique({
    where: { duelId_userId: { duelId, userId } },
    include: { duel: true }
  });
  if (!invite || invite.status !== 'PENDING') {
    return { ok: false as const, error: 'INVITE_NOT_FOUND' };
  }
  if (invite.duel.status !== 'PENDING') {
    return { ok: false as const, error: 'DUEL_NOT_PENDING' };
  }
  if (invite.duel.expiresAt < new Date()) {
    await prisma.platformDuel.update({ where: { id: duelId }, data: { status: 'EXPIRED' } });
    return { ok: false as const, error: 'INVITE_EXPIRED' };
  }

  await prisma.platformDuelInvite.update({
    where: { id: invite.id },
    data: {
      status: accept ? 'ACCEPTED' : 'DECLINED',
      respondedAt: new Date()
    }
  });

  return { ok: true as const, accepted: accept };
};

export const startVipTable = async (hostId: string, duelId: string) => {
  const duel = await prisma.platformDuel.findUnique({
    where: { id: duelId },
    include: { invites: true }
  });
  if (!duel || duel.hostId !== hostId) {
    return { ok: false as const, error: 'DUEL_NOT_FOUND' };
  }
  if (duel.status !== 'PENDING') {
    return { ok: false as const, error: 'DUEL_NOT_PENDING' };
  }
  if (duel.expiresAt < new Date()) {
    await prisma.platformDuel.update({ where: { id: duelId }, data: { status: 'EXPIRED' } });
    return { ok: false as const, error: 'INVITE_EXPIRED' };
  }

  const accepted = duel.invites.filter((i) => i.status === 'ACCEPTED');
  if (accepted.length < 2) {
    return { ok: false as const, error: 'NEED_TWO_PLAYERS' };
  }

  const sessionId = await createVipSession(
    accepted.map((i) => i.userId),
    duel.mode,
    duel.buyIn
  );

  await prisma.platformDuel.update({
    where: { id: duelId },
    data: { status: 'LIVE', sessionId, startedAt: new Date() }
  });

  const humans = accepted.map((i) => i.userId);
  await recordMatchForPlayers(sessionId, humans, duel.mode, duel.buyIn);

  void notifyVipTableLive(humans.filter((id) => id !== hostId), {
    sessionId,
    mode: duel.mode,
    buyIn: duel.buyIn
  });

  return { ok: true as const, sessionId, players: humans };
};

export const cancelVipTable = async (hostId: string, duelId: string) => {
  const duel = await prisma.platformDuel.findUnique({ where: { id: duelId } });
  if (!duel || duel.hostId !== hostId) {
    return { ok: false as const, error: 'DUEL_NOT_FOUND' };
  }
  if (duel.status !== 'PENDING') {
    return { ok: false as const, error: 'DUEL_NOT_PENDING' };
  }
  await prisma.platformDuel.update({ where: { id: duelId }, data: { status: 'CANCELLED' } });
  return { ok: true as const };
};
