import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { superAdminGuard } from '../middleware/super-admin.js';
import {
  getAdminUserDetail,
  grantAllCosmetics,
  grantCosmeticItems,
  grantFounderPackage,
  grantSubscription,
  grantTierCosmetics,
  revokeUserSubscriptions
} from '../services/admin-grants.js';
import { grantOrganizerPlan, revokeOrganizerPlan } from '../services/club-plans.js';
import {
  cancelVipTable,
  createVipTableInvite,
  listAdminVipTables,
  startVipTable
} from '../services/vip-table.js';

const subscriptionSchema = z.object({
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'BLACK']),
  lifetime: z.boolean().optional().default(false)
});

const chipsSchema = z.object({
  chips: z.number().int().min(0).max(10_000_000)
});

const cosmeticsSchema = z.object({
  itemIds: z.array(z.string()).optional(),
  grantAll: z.boolean().optional()
});

const roleSchema = z.object({
  role: z.enum(['USER', 'SUPERADMIN'])
});

const organizerPlanSchema = z.object({
  tier: z.enum(['BASIC', 'PRO', 'NETWORK']),
  lifetime: z.boolean().optional().default(false)
});

const tierCosmeticsSchema = z.object({
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'BLACK'])
});

const vipTableSchema = z.object({
  nicknames: z.array(z.string().min(1)).min(1).max(5),
  mode: z.enum(['HOLDEM', 'JOKER']).default('HOLDEM'),
  buyIn: z.number().int().min(100).max(100_000).default(1000),
  message: z.string().max(120).optional()
});

export const adminRoutes = new Hono();

/** One-time founder bootstrap — requires FOUNDER_GRANT_SECRET header (set in Vercel env). */
adminRoutes.post('/bootstrap-founder', async (c) => {
  const secret = config.founderGrantSecret;
  if (!secret || c.req.header('x-founder-secret') !== secret) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const email = (c.req.query('email') ?? 'iristonweb@gmail.com').trim();
  const result = await grantFounderPackage(email);
  if (!result.ok) return c.json({ error: result.error }, 404);
  return c.json(result);
});

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
    scheduledPrivateTables,
    pendingVipTables,
    failedPayments24h,
    unresolvedCompliance,
    organizerPlansActive,
    organizerPlansPastDue
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
    prisma.privateTable.count({ where: { status: 'SCHEDULED' } }),
    prisma.platformDuel.count({ where: { status: 'PENDING' } }),
    prisma.paymentEvent.count({
      where: { status: 'FAILED', createdAt: { gte: dayAgo } }
    }),
    prisma.complianceEvent.count({ where: { resolvedAt: null, severity: 'HIGH' } }),
    prisma.organizerSubscription.count({ where: { billingStatus: 'ACTIVE', tier: { not: 'BASIC' } } }),
    prisma.organizerSubscription.count({ where: { billingStatus: 'PAST_DUE' } })
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
    pendingVipTables,
    billing: {
      failedPayments24h,
      organizerPlansActive,
      organizerPlansPastDue
    },
    compliance: { unresolvedHigh: unresolvedCompliance },
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
  const q = c.req.query('q')?.trim();

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { nickname: { contains: q, mode: 'insensitive' as const } },
          { displayName: { contains: q, mode: 'insensitive' as const } }
        ]
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
        level: true,
        xp: true,
        emailVerified: true,
        createdAt: true,
        subscriptions: {
          where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
          take: 1,
          select: { tier: true, expiresAt: true }
        }
      }
    }),
    prisma.user.count({ where })
  ]);

  return c.json({
    users: users.map(({ subscriptions, ...u }) => ({
      ...u,
      subscriptionTier: subscriptions[0]?.tier ?? null
    })),
    total,
    take,
    skip
  });
});

adminRoutes.get('/users/:id', async (c) => {
  const detail = await getAdminUserDetail(c.req.param('id'));
  if (!detail) return c.json({ error: 'User not found' }, 404);
  return c.json({ user: detail });
});

adminRoutes.post('/users/:id/subscription', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const user = await prisma.user.findUnique({ where: { id: c.req.param('id') }, select: { id: true } });
  if (!user) return c.json({ error: 'User not found' }, 404);

  await grantSubscription(user.id, parsed.data.tier, parsed.data.lifetime);
  await grantTierCosmetics(user.id, parsed.data.tier);
  return c.json({ ok: true, tier: parsed.data.tier, lifetime: parsed.data.lifetime });
});

adminRoutes.post('/users/:id/subscription/revoke', async (c) => {
  const user = await prisma.user.findUnique({ where: { id: c.req.param('id') }, select: { id: true } });
  if (!user) return c.json({ error: 'User not found' }, 404);
  await revokeUserSubscriptions(user.id);
  return c.json({ ok: true });
});

adminRoutes.post('/users/:id/cosmetics/tier', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tierCosmeticsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const user = await prisma.user.findUnique({ where: { id: c.req.param('id') }, select: { id: true } });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const granted = await grantTierCosmetics(user.id, parsed.data.tier);
  return c.json({ ok: true, granted: granted.length });
});

adminRoutes.post('/clubs/:id/plan', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = organizerPlanSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const result = await grantOrganizerPlan(c.req.param('id'), parsed.data.tier, parsed.data.lifetime);
  if (!result.ok) return c.json({ error: result.error }, 404);
  return c.json(result);
});

adminRoutes.post('/clubs/:id/plan/revoke', async (c) => {
  const result = await revokeOrganizerPlan(c.req.param('id'));
  if (!result.ok) return c.json({ error: result.error }, 404);
  return c.json(result);
});

adminRoutes.post('/users/:id/cosmetics', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = cosmeticsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const user = await prisma.user.findUnique({ where: { id: c.req.param('id') }, select: { id: true } });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const granted = parsed.data.grantAll
    ? await grantAllCosmetics(user.id)
    : await grantCosmeticItems(user.id, parsed.data.itemIds ?? []);

  return c.json({ ok: true, granted });
});

adminRoutes.post('/users/:id/chips', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chipsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const user = await prisma.user.update({
    where: { id: c.req.param('id') },
    data: { chips: parsed.data.chips },
    select: { id: true, chips: true }
  });
  return c.json({ ok: true, chips: user.chips });
});

adminRoutes.post('/users/:id/role', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const user = await prisma.user.update({
    where: { id: c.req.param('id') },
    data: { role: parsed.data.role },
    select: { id: true, role: true }
  });
  return c.json({ ok: true, role: user.role });
});

adminRoutes.post('/founder/grant', async (c) => {
  const email = (c.req.query('email') ?? 'iristonweb@gmail.com').trim();
  const result = await grantFounderPackage(email);
  if (!result.ok) return c.json({ error: result.error }, 404);
  return c.json(result);
});

adminRoutes.get('/vip-tables', async (c) => {
  const hostId = c.get('auth').userId;
  const duels = await listAdminVipTables(hostId);
  return c.json({ duels });
});

adminRoutes.post('/vip-tables', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = vipTableSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const result = await createVipTableInvite(c.get('auth').userId, parsed.data);
  if (!result.ok) {
    return c.json({ error: result.error, missing: result.missing }, 400);
  }
  return c.json({ duel: result.duel }, 201);
});

adminRoutes.post('/vip-tables/:id/start', async (c) => {
  const result = await startVipTable(c.get('auth').userId, c.req.param('id'));
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json(result);
});

adminRoutes.post('/vip-tables/:id/cancel', async (c) => {
  const result = await cancelVipTable(c.get('auth').userId, c.req.param('id'));
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.body(null, 204);
});

const compliancePatchSchema = z.object({
  resolved: z.boolean().optional(),
  severity: z.enum(['INFO', 'MEDIUM', 'HIGH']).optional()
});

adminRoutes.get('/compliance-events', async (c) => {
  const take = Math.min(Number(c.req.query('take') ?? 50), 100);
  const severity = c.req.query('severity')?.trim();
  const unresolved = c.req.query('unresolved') === 'true';

  const events = await prisma.complianceEvent.findMany({
    where: {
      ...(severity ? { severity } : {}),
      ...(unresolved ? { resolvedAt: null } : {})
    },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      club: { select: { id: true, name: true } }
    }
  });

  return c.json({ events });
});

adminRoutes.patch('/compliance-events/:id', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = compliancePatchSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const data: { resolvedAt?: Date | null; severity?: string } = {};
  if (parsed.data.resolved === true) data.resolvedAt = new Date();
  if (parsed.data.resolved === false) data.resolvedAt = null;
  if (parsed.data.severity) data.severity = parsed.data.severity;

  const event = await prisma.complianceEvent.update({
    where: { id: c.req.param('id') },
    data
  });
  return c.json({ event });
});
