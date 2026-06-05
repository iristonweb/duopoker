import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth-guard.js';
import { prisma } from '../services/prisma.js';

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

export const clubsRouter = Router();

clubsRouter.get('/plans', (_req, res) => {
  res.json({
    organizerPlans: [
      {
        tier: 'BASIC',
        name: 'Club Basic',
        priceUsdMonthly: 15,
        limits: PLAN_LIMITS.BASIC
      },
      {
        tier: 'PRO',
        name: 'Club Pro',
        priceUsdMonthly: 39,
        limits: PLAN_LIMITS.PRO
      },
      {
        tier: 'NETWORK',
        name: 'Club Network',
        priceUsdMonthly: 99,
        limits: PLAN_LIMITS.NETWORK
      }
    ],
    compliance: {
      nonGamblingOnly: true,
      disclaimer: NON_GAMBLING_DISCLAIMER
    }
  });
});

clubsRouter.use(authGuard);

const requireClubAdmin = async (clubId: string, userId: string) => {
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { role: true }
  });
  if (!membership) return false;
  return membership.role === 'OWNER' || membership.role === 'ADMIN';
};

clubsRouter.post('/', async (req, res) => {
  const parsed = createClubSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const ownerId = req.auth!.userId;
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
      data: {
        clubId: created.id,
        userId: ownerId,
        role: 'OWNER'
      }
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
        details: {
          nonGamblingDisclaimerAccepted: true
        }
      }
    });
    return created;
  });
  return res.status(201).json({
    club,
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRouter.get('/mine', async (req, res) => {
  const userId = req.auth!.userId;
  const memberships = await prisma.clubMembership.findMany({
    where: { userId },
    select: { clubId: true, role: true }
  });
  if (!memberships.length) {
    return res.json({
      clubs: [],
      disclaimer: NON_GAMBLING_DISCLAIMER
    });
  }
  const clubs = await prisma.club.findMany({
    where: { id: { in: memberships.map((m) => m.clubId) }, isArchived: false },
    include: {
      organizerPlan: {
        select: {
          tier: true,
          status: true,
          expiresAt: true
        }
      },
      _count: {
        select: { members: true, privateTables: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return res.json({
    clubs: clubs.map((club) => {
      const membership = memberships.find((m) => m.clubId === club.id);
      return {
        ...club,
        myRole: membership?.role ?? 'MEMBER'
      };
    }),
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRouter.post('/:clubId/members', async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const clubId = req.params.clubId;
  const actorId = req.auth!.userId;
  const isAdmin = await requireClubAdmin(clubId, actorId);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { organizerPlan: true, _count: { select: { members: true } } }
  });
  if (!club || club.isArchived) {
    return res.status(404).json({ error: 'Club not found' });
  }
  const tier = club.organizerPlan?.tier ?? 'BASIC';
  const maxMembers = PLAN_LIMITS[tier].maxMembers;
  if (club._count.members >= maxMembers) {
    return res.status(409).json({ error: `Member limit reached for ${tier} plan` });
  }
  const membership = await prisma.clubMembership.upsert({
    where: {
      clubId_userId: {
        clubId,
        userId: parsed.data.userId
      }
    },
    update: { role: parsed.data.role },
    create: {
      clubId,
      userId: parsed.data.userId,
      role: parsed.data.role
    }
  });
  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'club.member.upsert',
      details: { memberUserId: parsed.data.userId, role: parsed.data.role }
    }
  });
  return res.status(201).json({ membership });
});

clubsRouter.post('/:clubId/private-tables', async (req, res) => {
  const parsed = createTableSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const clubId = req.params.clubId;
  const actorId = req.auth!.userId;
  const isAdmin = await requireClubAdmin(clubId, actorId);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { organizerPlan: true, _count: { select: { privateTables: true } } }
  });
  if (!club || club.isArchived) {
    return res.status(404).json({ error: 'Club not found' });
  }
  const tier = club.organizerPlan?.tier ?? 'BASIC';
  const maxTables = PLAN_LIMITS[tier].maxActiveTables;
  const activeTableCount = await prisma.privateTable.count({
    where: { clubId, status: { in: ['SCHEDULED', 'LIVE'] } }
  });
  if (activeTableCount >= maxTables) {
    return res.status(409).json({ error: `Table limit reached for ${tier} plan` });
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
  return res.status(201).json({
    table,
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRouter.get('/:clubId/private-tables', async (req, res) => {
  const clubId = req.params.clubId;
  const actorId = req.auth!.userId;
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: actorId } },
    select: { role: true }
  });
  if (!membership) {
    return res.status(403).json({ error: 'Club membership required' });
  }
  const tables = await prisma.privateTable.findMany({
    where: { clubId },
    orderBy: { createdAt: 'desc' }
  });
  return res.json({
    tables,
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});
