import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { superAdminGuard } from '../middleware/super-admin.js';

export const adminRoutes = new Hono();

adminRoutes.use('*', ...superAdminGuard);

adminRoutes.get('/health', (c) =>
  c.json({ ok: true, role: 'SUPERADMIN', timestamp: new Date().toISOString() })
);

adminRoutes.get('/stats', async (c) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    superAdmins,
    verifiedUsers,
    newUsers24h,
    activeSubscriptions,
    activeSessions,
    inProgressSessions,
    waitingQueue,
    totalClubs,
    livePrivateTables,
    scheduledPrivateTables
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'SUPERADMIN' } }),
    prisma.user.count({ where: { emailVerified: true } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.gameSession.count({ where: { status: { in: ['LOBBY', 'IN_PROGRESS'] } } }),
    prisma.gameSession.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.matchmakingTicket.count(),
    prisma.club.count(),
    prisma.privateTable.count({ where: { status: 'LIVE' } }),
    prisma.privateTable.count({ where: { status: 'SCHEDULED' } })
  ]);

  return c.json({
    totalUsers,
    superAdmins,
    verifiedUsers,
    newUsers24h,
    activeSubscriptions,
    activeSessions,
    inProgressSessions,
    waitingQueue,
    totalClubs,
    livePrivateTables,
    scheduledPrivateTables,
    timestamp: now.toISOString()
  });
});

adminRoutes.get('/sessions', async (c) => {
  const take = Math.min(Number(c.req.query('take') ?? 30), 100);
  const sessions = await prisma.gameSession.findMany({
    where: { status: { in: ['LOBBY', 'IN_PROGRESS'] } },
    take,
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      mode: true,
      status: true,
      players: true,
      buyIn: true,
      startedAt: true
    }
  });
  return c.json({ sessions });
});

adminRoutes.get('/queue', async (c) => {
  const tickets = await prisma.matchmakingTicket.findMany({
    orderBy: { createdAt: 'asc' },
    take: 50
  });
  const userIds = tickets.map((t) => t.userId);
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, displayName: true, nickname: true }
        })
      : [];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  return c.json({
    tickets: tickets.map((t) => ({
      ...t,
      user: userMap[t.userId] ?? null
    }))
  });
});

adminRoutes.get('/users', async (c) => {
  const take = Math.min(Number(c.req.query('take') ?? 50), 100);
  const skip = Math.max(Number(c.req.query('skip') ?? 0), 0);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        role: true,
        chips: true,
        emailVerified: true,
        createdAt: true
      }
    }),
    prisma.user.count()
  ]);
  return c.json({ users, total, take, skip });
});
