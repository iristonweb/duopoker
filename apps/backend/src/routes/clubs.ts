import { Router } from 'express';
import { z } from 'zod';
import { clubTableMaxPlayers, normalizeGameMode, organizerPlanBanners } from '@duopoker/shared-types';
import { authGuard } from '../middleware/auth-guard.js';
import { normalizeNicknameInput } from '@duopoker/server-shared/lib/nickname';
import { config } from '../config.js';
import { prisma } from '../services/prisma.js';
import {
  NON_GAMBLING_DISCLAIMER,
  ORGANIZER_PLAN_PRICES_RUB,
  PLAN_LIMITS,
  effectiveMaxPlayers,
  getEffectiveOrganizerTier
} from '../services/club-plans.js';
import { createOrganizerPayment } from '../services/yookassa.js';
import { joinTable } from '../services/game-session.js';

const createClubSchema = z.object({
  name: z.string().trim().min(3).max(50),
  description: z.string().trim().max(280).optional(),
  visibility: z.enum(['PRIVATE', 'INVITE_ONLY']).default('PRIVATE')
});

const addMemberSchema = z
  .object({
    userId: z.string().min(1).optional(),
    nickname: z.string().min(1).optional(),
    role: z.enum(['ADMIN', 'MODERATOR', 'MEMBER']).default('MEMBER')
  })
  .refine((d) => d.userId || d.nickname, { message: 'userId or nickname required' });

const inviteSchema = z
  .object({
    userId: z.string().min(1).optional(),
    nickname: z.string().min(1).optional()
  })
  .refine((d) => d.userId || d.nickname, { message: 'userId or nickname required' });

const createTableSchema = z
  .object({
    name: z.string().trim().min(3).max(50),
    mode: z.preprocess(
      (v) => (typeof v === 'string' ? normalizeGameMode(v as 'HOLDEM' | 'JOKER' | 'RASPISNOY') : v),
      z.enum(['HOLDEM', 'JOKER'])
    ),
    maxPlayers: z.number().int().min(2).max(9).default(6),
    virtualBuyIn: z.number().int().min(100).max(100000).default(1000)
  })
  .transform((data) => ({
    ...data,
    maxPlayers: clubTableMaxPlayers(data.mode, data.maxPlayers)
  }));

const checkoutSchema = z.object({ tier: z.enum(['PRO', 'NETWORK']) });

export const clubsRouter = Router();

clubsRouter.get('/plans', (_req, res) => {
  res.json({
    organizerPlans: [
      {
        tier: 'BASIC',
        name: 'Club Basic',
        priceRubMonthly: 0,
        limits: PLAN_LIMITS.BASIC,
        imageUrl: organizerPlanBanners.BASIC
      },
      {
        tier: 'PRO',
        name: 'Club Pro',
        priceRubMonthly: ORGANIZER_PLAN_PRICES_RUB.PRO,
        limits: PLAN_LIMITS.PRO,
        imageUrl: organizerPlanBanners.PRO
      },
      {
        tier: 'NETWORK',
        name: 'Club Network',
        priceRubMonthly: ORGANIZER_PLAN_PRICES_RUB.NETWORK,
        limits: PLAN_LIMITS.NETWORK,
        imageUrl: organizerPlanBanners.NETWORK
      }
    ],
    compliance: { nonGamblingOnly: true, disclaimer: NON_GAMBLING_DISCLAIMER }
  });
});

clubsRouter.get('/invite/:inviteCode', async (req, res) => {
  const table = await prisma.privateTable.findUnique({
    where: { inviteCode: req.params.inviteCode },
    include: {
      club: { select: { id: true, name: true } },
      seats: { include: { user: { select: { id: true, nickname: true, displayName: true } } } }
    }
  });
  if (!table) return res.status(404).json({ error: 'Invite not found' });
  return res.json({
    table: {
      id: table.id,
      name: table.name,
      mode: table.mode,
      status: table.status,
      maxPlayers: table.maxPlayers,
      virtualBuyIn: table.virtualBuyIn,
      sessionId: table.sessionId,
      inviteCode: table.inviteCode,
      clubId: table.clubId,
      clubName: table.club.name
    },
    seats: table.seats.map((s) => ({
      userId: s.userId,
      nickname: s.user.nickname,
      displayName: s.user.displayName,
      status: s.status
    })),
    disclaimer: NON_GAMBLING_DISCLAIMER
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

const requireClubMember = async (clubId: string, userId: string) =>
  prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId, userId } } });

const resolveTargetUserId = async (data: { userId?: string; nickname?: string }) => {
  if (data.userId) {
    const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
    return user?.id ?? null;
  }
  if (data.nickname) {
    const nick = normalizeNicknameInput(data.nickname);
    const user = await prisma.user.findUnique({ where: { nickname: nick }, select: { id: true } });
    return user?.id ?? null;
  }
  return null;
};

clubsRouter.post('/', async (req, res) => {
  const parsed = createClubSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
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
    await tx.clubMembership.create({ data: { clubId: created.id, userId: ownerId, role: 'OWNER' } });
    await tx.organizerSubscription.create({
      data: {
        clubId: created.id,
        ownerId,
        tier: 'BASIC',
        status: 'ACTIVE',
        billingProvider: 'YOOKASSA',
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
  return res.status(201).json({ club, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.get('/mine', async (req, res) => {
  const userId = req.auth!.userId;
  const memberships = await prisma.clubMembership.findMany({
    where: { userId },
    select: { clubId: true, role: true }
  });
  if (!memberships.length) {
    return res.json({ clubs: [], disclaimer: NON_GAMBLING_DISCLAIMER });
  }
  const clubs = await prisma.club.findMany({
    where: { id: { in: memberships.map((m) => m.clubId) }, isArchived: false },
    include: {
      organizerPlan: { select: { tier: true, status: true, expiresAt: true } },
      _count: { select: { members: true, privateTables: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return res.json({
    clubs: clubs.map((club) => {
      const membership = memberships.find((m) => m.clubId === club.id);
      const tier = getEffectiveOrganizerTier(club.organizerPlan);
      return { ...club, myRole: membership?.role ?? 'MEMBER', limits: PLAN_LIMITS[tier] };
    }),
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRouter.get('/:clubId', async (req, res) => {
  const clubId = req.params.clubId;
  const userId = req.auth!.userId;
  const membership = await requireClubMember(clubId, userId);
  if (!membership) return res.status(403).json({ error: 'Club membership required' });

  const club = await prisma.club.findUnique({
    where: { id: clubId, isArchived: false },
    include: {
      organizerPlan: true,
      members: {
        include: { user: { select: { id: true, nickname: true, displayName: true, avatar: true } } },
        orderBy: { joinedAt: 'asc' }
      },
      _count: { select: { members: true, privateTables: true } }
    }
  });
  if (!club) return res.status(404).json({ error: 'Club not found' });

  const tier = getEffectiveOrganizerTier(club.organizerPlan);
  const activeTables = await prisma.privateTable.count({
    where: { clubId, status: { in: ['SCHEDULED', 'LIVE'] } }
  });

  return res.json({
    club: {
      ...club,
      myRole: membership.role,
      limits: PLAN_LIMITS[tier],
      usage: { members: club._count.members, activeTables }
    },
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRouter.post('/:clubId/checkout', async (req, res) => {
  const clubId = req.params.clubId;
  const userId = req.auth!.userId;
  if (!(await requireClubAdmin(clubId, userId))) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const club = await prisma.club.findUnique({ where: { id: clubId, isArchived: false } });
  if (!club) return res.status(404).json({ error: 'Club not found' });

  try {
    const returnUrl = `${config.publicWebUrl.replace(/\/$/, '')}/clubs/${clubId}?checkout=success`;
    const result = await createOrganizerPayment({
      clubId,
      ownerId: userId,
      tier: parsed.data.tier,
      returnUrl
    });
    return res.json({
      paymentId: result.paymentId,
      confirmationUrl: result.confirmationUrl,
      tier: parsed.data.tier,
      mock: config.mockCheckout
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment failed';
    if (msg === 'YOOKASSA_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'YooKassa not configured' });
    }
    return res.status(502).json({ error: msg });
  }
});

clubsRouter.post('/:clubId/members', async (req, res) => {
  const parsed = addMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const clubId = req.params.clubId;
  const actorId = req.auth!.userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) return res.status(404).json({ error: 'User not found' });

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { organizerPlan: true, _count: { select: { members: true } } }
  });
  if (!club || club.isArchived) return res.status(404).json({ error: 'Club not found' });

  const tier = getEffectiveOrganizerTier(club.organizerPlan);
  if (club._count.members >= PLAN_LIMITS[tier].maxMembers) {
    return res.status(409).json({ error: `Member limit reached for ${tier} plan` });
  }

  const membership = await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId, userId: targetUserId } },
    update: { role: parsed.data.role },
    create: { clubId, userId: targetUserId, role: parsed.data.role }
  });
  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'club.member.upsert',
      details: { memberUserId: targetUserId, role: parsed.data.role }
    }
  });
  return res.status(201).json({ membership });
});

clubsRouter.post('/:clubId/private-tables', async (req, res) => {
  const parsed = createTableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const clubId = req.params.clubId;
  const actorId = req.auth!.userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const club = await prisma.club.findUnique({ where: { id: clubId }, include: { organizerPlan: true } });
  if (!club || club.isArchived) return res.status(404).json({ error: 'Club not found' });

  const tier = getEffectiveOrganizerTier(club.organizerPlan);
  const activeTableCount = await prisma.privateTable.count({
    where: { clubId, status: { in: ['SCHEDULED', 'LIVE'] } }
  });
  if (activeTableCount >= PLAN_LIMITS[tier].maxActiveTables) {
    return res.status(409).json({ error: `Table limit reached for ${tier} plan` });
  }

  const table = await prisma.privateTable.create({
    data: {
      clubId,
      hostUserId: actorId,
      name: parsed.data.name,
      mode: parsed.data.mode,
      maxPlayers: parsed.data.maxPlayers,
      virtualBuyIn: parsed.data.virtualBuyIn,
      seats: { create: { userId: actorId, status: 'ACCEPTED', invitedByUserId: actorId } }
    },
    include: { seats: true }
  });

  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'private_table.created',
      details: { tableId: table.id, mode: table.mode, virtualBuyIn: table.virtualBuyIn, nonCashEconomy: true }
    }
  });
  return res.status(201).json({ table, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.get('/:clubId/private-tables', async (req, res) => {
  const clubId = req.params.clubId;
  const actorId = req.auth!.userId;
  if (!(await requireClubMember(clubId, actorId))) {
    return res.status(403).json({ error: 'Club membership required' });
  }
  const tables = await prisma.privateTable.findMany({
    where: { clubId },
    include: {
      seats: { include: { user: { select: { id: true, nickname: true, displayName: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  });
  return res.json({ tables, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.get('/:clubId/private-tables/:tableId', async (req, res) => {
  const { clubId, tableId } = req.params;
  const actorId = req.auth!.userId;
  if (!(await requireClubMember(clubId, actorId))) {
    return res.status(403).json({ error: 'Club membership required' });
  }
  const table = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId },
    include: {
      seats: { include: { user: { select: { id: true, nickname: true, displayName: true } } } }
    }
  });
  if (!table) return res.status(404).json({ error: 'Table not found' });
  return res.json({ table, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.post('/:clubId/private-tables/:tableId/invite', async (req, res) => {
  const { clubId, tableId } = req.params;
  const actorId = req.auth!.userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) return res.status(404).json({ error: 'User not found' });

  const table = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId, status: { in: ['SCHEDULED', 'LIVE'] } },
    include: { _count: { select: { seats: true } } }
  });
  if (!table) return res.status(404).json({ error: 'Table not found or closed' });
  if (table._count.seats >= effectiveMaxPlayers(table.maxPlayers)) {
    return res.status(409).json({ error: 'Table is full' });
  }
  if (!(await requireClubMember(clubId, targetUserId))) {
    return res.status(400).json({ error: 'User must be a club member first' });
  }

  const seat = await prisma.privateTableSeat.upsert({
    where: { tableId_userId: { tableId, userId: targetUserId } },
    update: { status: 'INVITED', invitedByUserId: actorId },
    create: { tableId, userId: targetUserId, status: 'INVITED', invitedByUserId: actorId },
    include: { user: { select: { id: true, nickname: true, displayName: true } } }
  });
  return res.status(201).json({ seat });
});

clubsRouter.post('/:clubId/private-tables/:tableId/accept', async (req, res) => {
  const { clubId, tableId } = req.params;
  const userId = req.auth!.userId;
  if (!(await requireClubMember(clubId, userId))) {
    return res.status(403).json({ error: 'Club membership required' });
  }
  const seat = await prisma.privateTableSeat.findUnique({
    where: { tableId_userId: { tableId, userId } }
  });
  if (!seat || seat.status !== 'INVITED') return res.status(404).json({ error: 'No pending invite' });
  const updated = await prisma.privateTableSeat.update({
    where: { id: seat.id },
    data: { status: 'ACCEPTED' }
  });
  return res.json({ seat: updated });
});

clubsRouter.post('/:clubId/private-tables/:tableId/start', async (req, res) => {
  const { clubId, tableId } = req.params;
  const actorId = req.auth!.userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const table = await prisma.privateTable.findFirst({ where: { id: tableId, clubId } });
  if (!table) return res.status(404).json({ error: 'Table not found' });
  if (table.status === 'LIVE' && table.sessionId) {
    return res.json({ table, sessionId: table.sessionId });
  }
  if (table.status === 'CLOSED') return res.status(409).json({ error: 'Table is closed' });

  const sessionId = `club-${tableId.slice(-8)}-${Date.now()}`;
  await prisma.privateTable.update({
    where: { id: tableId },
    data: { status: 'LIVE', sessionId, startsAt: new Date() }
  });
  await prisma.gameSession.create({
    data: { id: sessionId, mode: table.mode, status: 'LOBBY', players: [], buyIn: table.virtualBuyIn, rake: 0 }
  });
  await joinTable(sessionId, table.hostUserId, table.mode, table.virtualBuyIn);
  await prisma.privateTableSeat.updateMany({
    where: { tableId, userId: table.hostUserId },
    data: { status: 'SEATED' }
  });
  await prisma.complianceEvent.create({
    data: { clubId, actorUserId: actorId, type: 'private_table.started', details: { tableId, sessionId } }
  });

  const updated = await prisma.privateTable.findUnique({ where: { id: tableId } });
  return res.json({ table: updated, sessionId, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.post('/:clubId/private-tables/:tableId/join', async (req, res) => {
  const { clubId, tableId } = req.params;
  const userId = req.auth!.userId;

  const table = await prisma.privateTable.findFirst({ where: { id: tableId, clubId } });
  if (!table) return res.status(404).json({ error: 'Table not found' });
  if (table.status !== 'LIVE' || !table.sessionId) {
    return res.status(409).json({ error: 'Table is not live yet' });
  }

  const membership = await requireClubMember(clubId, userId);
  const isAdmin =
    membership &&
    (membership.role === 'OWNER' || membership.role === 'ADMIN' || table.hostUserId === userId);
  const seat = await prisma.privateTableSeat.findUnique({
    where: { tableId_userId: { tableId, userId } }
  });
  if (!isAdmin && (!seat || (seat.status !== 'ACCEPTED' && seat.status !== 'SEATED'))) {
    return res.status(403).json({ error: 'Invite required to join this table' });
  }

  const state = await joinTable(table.sessionId, userId, table.mode, table.virtualBuyIn);
  if (seat) {
    await prisma.privateTableSeat.update({ where: { id: seat.id }, data: { status: 'SEATED' } });
  }
  return res.json({ sessionId: table.sessionId, players: state.players, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.post('/:clubId/private-tables/:tableId/close', async (req, res) => {
  const { clubId, tableId } = req.params;
  const actorId = req.auth!.userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  const existing = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId }
  });
  if (!existing) return res.status(404).json({ error: 'Table not found' });

  const closedSessionId = existing.sessionId;
  const table = await prisma.privateTable.update({
    where: { id: tableId },
    data: { status: 'CLOSED', closedAt: new Date(), sessionId: null }
  });
  if (closedSessionId) {
    await prisma.gameSession.updateMany({
      where: { id: closedSessionId },
      data: { status: 'FINISHED', finishedAt: new Date() }
    });
    const { clearTableChatSession } = await import('../services/table-chat.js');
    clearTableChatSession(closedSessionId);
    const { emitTableClosedToSession } = await import('../socket/server.js');
    emitTableClosedToSession(closedSessionId, {
      clubId,
      tableId,
      sessionId: closedSessionId
    });
  }
  await prisma.complianceEvent.create({
    data: { clubId, actorUserId: actorId, type: 'private_table.closed', details: { tableId } }
  });
  return res.json({ table, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRouter.post('/invite/:inviteCode/accept', async (req, res) => {
  const userId = req.auth!.userId;
  const table = await prisma.privateTable.findUnique({ where: { inviteCode: req.params.inviteCode } });
  if (!table) return res.status(404).json({ error: 'Invite not found' });
  if (!(await requireClubMember(table.clubId, userId))) {
    return res.status(403).json({ error: 'Club membership required' });
  }
  const seat = await prisma.privateTableSeat.upsert({
    where: { tableId_userId: { tableId: table.id, userId } },
    update: { status: 'ACCEPTED' },
    create: { tableId: table.id, userId, status: 'ACCEPTED', invitedByUserId: table.hostUserId }
  });
  return res.json({ seat, tableId: table.id, clubId: table.clubId });
});
