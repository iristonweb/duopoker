import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const createClubSchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().trim().max(280).optional(),
  visibility: z.enum(['PRIVATE', 'INVITE_ONLY']).default('PRIVATE')
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']).default('MEMBER')
});

const createTableSchema = z.object({
  name: z.string().trim().min(3).max(50),
  mode: z.enum(['HOLDEM', 'RASPISNOY']),
  maxPlayers: z.number().int().min(2).max(9).default(6),
  virtualBuyIn: z.number().int().min(100).max(100000).default(1000)
});

const PLAN_LIMITS = {
  BASIC: { maxMembers: 30, maxActiveTables: 2 },
  PRO: { maxMembers: 150, maxActiveTables: 8 },
  NETWORK: { maxMembers: 600, maxActiveTables: 20 }
} as const;

const NON_GAMBLING_DISCLAIMER =
  'DuoPoker private clubs are play-money only. No cashout, no rake, no payout handling, and no peer-to-peer money transfers in product.';

export const clubsRoutes = new Hono();

clubsRoutes.get('/plans', (c) =>
  c.json({
    organizerPlans: [
      { tier: 'BASIC', name: 'Club Basic', priceUsdMonthly: 15, limits: PLAN_LIMITS.BASIC },
      { tier: 'PRO', name: 'Club Pro', priceUsdMonthly: 39, limits: PLAN_LIMITS.PRO },
      { tier: 'NETWORK', name: 'Club Network', priceUsdMonthly: 99, limits: PLAN_LIMITS.NETWORK }
    ],
    compliance: { nonGamblingOnly: true, disclaimer: NON_GAMBLING_DISCLAIMER }
  })
);

clubsRoutes.use('*', authGuard);

const requireClubAdmin = async (clubId: string, userId: string) => {
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { role: true }
  });
  if (!membership) return false;
  return membership.role === 'OWNER' || membership.role === 'ADMIN';
};

clubsRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createClubSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const ownerId = c.get('auth').userId;
  const club = await prisma.$transaction(async (tx) => {
    const created = await tx.club.create({
      data: {
        ownerId,
        name: parsed.data.name,
        description: parsed.data.description,
        visibility: parsed.data.visibility
      }
    });
    await tx.clubMembership.create({
      data: { clubId: created.id, userId: ownerId, role: 'OWNER' }
    });
    await tx.organizerSubscription.create({
      data: {
        clubId: created.id,
        ownerId,
        tier: 'BASIC',
        status: 'ACTIVE',
        billingProvider: 'STRIPE',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31)
      }
    });
    await tx.complianceEvent.create({
      data: {
        clubId: created.id,
        actorUserId: ownerId,
        type: 'club.created',
        details: { nonGamblingDisclaimerAccepted: true }
      }
    });
    return created;
  });
  return c.json({ club, disclaimer: NON_GAMBLING_DISCLAIMER }, 201);
});

clubsRoutes.get('/mine', async (c) => {
  const userId = c.get('auth').userId;
  const memberships = await prisma.clubMembership.findMany({
    where: { userId },
    select: { clubId: true, role: true }
  });
  if (!memberships.length) {
    return c.json({ clubs: [], disclaimer: NON_GAMBLING_DISCLAIMER });
  }
  const clubs = await prisma.club.findMany({
    where: { id: { in: memberships.map((m) => m.clubId) }, isArchived: false },
    include: {
      organizerPlan: { select: { tier: true, status: true, expiresAt: true } },
      _count: { select: { members: true, privateTables: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({
    clubs: clubs.map((club) => {
      const membership = memberships.find((m) => m.clubId === club.id);
      return { ...club, myRole: membership?.role ?? 'MEMBER' };
    }),
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRoutes.post('/:clubId/members', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const clubId = c.req.param('clubId');
  const actorId = c.get('auth').userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return c.json({ error: 'Admin role required' }, 403);
  }
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { organizerPlan: true, _count: { select: { members: true } } }
  });
  if (!club || club.isArchived) return c.json({ error: 'Club not found' }, 404);
  const tier = club.organizerPlan?.tier ?? 'BASIC';
  const maxMembers = PLAN_LIMITS[tier].maxMembers;
  if (club._count.members >= maxMembers) {
    return c.json({ error: `Member limit reached for ${tier} plan` }, 409);
  }
  const membership = await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId, userId: parsed.data.userId } },
    update: { role: parsed.data.role },
    create: { clubId, userId: parsed.data.userId, role: parsed.data.role }
  });
  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'club.member.upsert',
      details: { memberUserId: parsed.data.userId, role: parsed.data.role }
    }
  });
  return c.json({ membership }, 201);
});

clubsRoutes.post('/:clubId/private-tables', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createTableSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const clubId = c.req.param('clubId');
  const actorId = c.get('auth').userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return c.json({ error: 'Admin role required' }, 403);
  }
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { organizerPlan: true, _count: { select: { privateTables: true } } }
  });
  if (!club || club.isArchived) return c.json({ error: 'Club not found' }, 404);
  const tier = club.organizerPlan?.tier ?? 'BASIC';
  const maxTables = PLAN_LIMITS[tier].maxActiveTables;
  const activeTableCount = await prisma.privateTable.count({
    where: { clubId, status: { in: ['SCHEDULED', 'LIVE'] } }
  });
  if (activeTableCount >= maxTables) {
    return c.json({ error: `Table limit reached for ${tier} plan` }, 409);
  }
  const table = await prisma.privateTable.create({
    data: {
      clubId,
      hostUserId: actorId,
      name: parsed.data.name,
      mode: parsed.data.mode,
      maxPlayers: parsed.data.maxPlayers,
      virtualBuyIn: parsed.data.virtualBuyIn
    }
  });
  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'private_table.created',
      details: {
        tableId: table.id,
        mode: table.mode,
        virtualBuyIn: table.virtualBuyIn,
        nonCashEconomy: true
      }
    }
  });
  return c.json({ table, disclaimer: NON_GAMBLING_DISCLAIMER }, 201);
});

clubsRoutes.get('/:clubId/private-tables', async (c) => {
  const clubId = c.req.param('clubId');
  const actorId = c.get('auth').userId;
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: actorId } },
    select: { role: true }
  });
  if (!membership) return c.json({ error: 'Club membership required' }, 403);
  const tables = await prisma.privateTable.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({ tables, disclaimer: NON_GAMBLING_DISCLAIMER });
});
