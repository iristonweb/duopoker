import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { normalizeNicknameInput } from '../lib/nickname.js';
import { joinTable } from '../services/game-session.js';
import { newSessionId } from '../services/session-access.js';
import {
  NON_GAMBLING_DISCLAIMER,
  ORGANIZER_PLAN_PRICES_RUB,
  PLAN_LIMITS,
  effectiveMaxPlayers,
  getEffectiveOrganizerTier
} from '../services/club-plans.js';
import { createOrganizerPayment } from '../services/yookassa.js';
import { config } from '../config.js';
import { organizerPlanBanners } from '@duopoker/shared-types';

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

const createTableSchema = z.object({
  name: z.string().trim().min(3).max(50),
  mode: z.enum(['HOLDEM', 'JOKER']),
  maxPlayers: z.number().int().min(2).max(9).default(6),
  virtualBuyIn: z.number().int().min(100).max(100000).default(1000)
});

const checkoutSchema = z.object({
  tier: z.enum(['PRO', 'NETWORK'])
});

export const clubsRoutes = new Hono();

clubsRoutes.get('/plans', (c) =>
  c.json({
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
  })
);

/** Public invite preview */
clubsRoutes.get('/invite/:inviteCode', async (c) => {
  const inviteCode = c.req.param('inviteCode');
  const table = await prisma.privateTable.findUnique({
    where: { inviteCode },
    include: {
      club: { select: { id: true, name: true, visibility: true } },
      seats: {
        include: {
          user: { select: { id: true, nickname: true, displayName: true } }
        }
      }
    }
  });
  if (!table) return c.json({ error: 'Invite not found' }, 404);
  return c.json({
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

clubsRoutes.use('*', authGuard);

const requireClubAdmin = async (clubId: string, userId: string) => {
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId } },
    select: { role: true }
  });
  if (!membership) return false;
  return membership.role === 'OWNER' || membership.role === 'ADMIN';
};

const requireClubMember = async (clubId: string, userId: string) => {
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId } }
  });
  return membership;
};

const resolveTargetUserId = async (data: { userId?: string; nickname?: string }) => {
  if (data.userId) {
    const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { id: true } });
    if (!user) return null;
    return user.id;
  }
  if (data.nickname) {
    const nick = normalizeNicknameInput(data.nickname);
    const user = await prisma.user.findUnique({ where: { nickname: nick }, select: { id: true } });
    if (!user) return null;
    return user.id;
  }
  return null;
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
      const tier = getEffectiveOrganizerTier(club.organizerPlan);
      return {
        ...club,
        myRole: membership?.role ?? 'MEMBER',
        limits: PLAN_LIMITS[tier]
      };
    }),
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRoutes.get('/:clubId', async (c) => {
  const clubId = c.req.param('clubId');
  const userId = c.get('auth').userId;
  const membership = await requireClubMember(clubId, userId);
  if (!membership) return c.json({ error: 'Club membership required' }, 403);

  const club = await prisma.club.findUnique({
    where: { id: clubId, isArchived: false },
    include: {
      organizerPlan: true,
      members: {
        include: {
          user: { select: { id: true, nickname: true, displayName: true, avatar: true } }
        },
        orderBy: { joinedAt: 'asc' }
      },
      _count: { select: { members: true, privateTables: true } }
    }
  });
  if (!club) return c.json({ error: 'Club not found' }, 404);

  const tier = getEffectiveOrganizerTier(club.organizerPlan);
  const activeTables = await prisma.privateTable.count({
    where: { clubId, status: { in: ['SCHEDULED', 'LIVE'] } }
  });

  return c.json({
    club: {
      ...club,
      myRole: membership.role,
      limits: PLAN_LIMITS[tier],
      usage: { members: club._count.members, activeTables }
    },
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRoutes.post('/:clubId/checkout', async (c) => {
  const clubId = c.req.param('clubId');
  const userId = c.get('auth').userId;
  if (!(await requireClubAdmin(clubId, userId))) {
    return c.json({ error: 'Admin role required' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const club = await prisma.club.findUnique({ where: { id: clubId, isArchived: false } });
  if (!club) return c.json({ error: 'Club not found' }, 404);

  try {
    const returnUrl = `${config.publicWebUrl.replace(/\/$/, '')}/clubs/${clubId}?checkout=success`;
    const result = await createOrganizerPayment({
      clubId,
      ownerId: userId,
      tier: parsed.data.tier,
      returnUrl
    });
    return c.json({
      paymentId: result.paymentId,
      confirmationUrl: result.confirmationUrl,
      tier: parsed.data.tier,
      mock: config.mockCheckout
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment failed';
    if (msg === 'YOOKASSA_NOT_CONFIGURED') {
      return c.json({ error: 'YooKassa not configured. Set YOOKASSA_* or MOCK_CHECKOUT=true.' }, 503);
    }
    return c.json({ error: msg }, 502);
  }
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

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) return c.json({ error: 'User not found' }, 404);

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    include: { organizerPlan: true, _count: { select: { members: true } } }
  });
  if (!club || club.isArchived) return c.json({ error: 'Club not found' }, 404);

  const tier = getEffectiveOrganizerTier(club.organizerPlan);
  if (club._count.members >= PLAN_LIMITS[tier].maxMembers) {
    return c.json({ error: `Member limit reached for ${tier} plan` }, 409);
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
    include: { organizerPlan: true }
  });
  if (!club || club.isArchived) return c.json({ error: 'Club not found' }, 404);

  const tier = getEffectiveOrganizerTier(club.organizerPlan);
  const activeTableCount = await prisma.privateTable.count({
    where: { clubId, status: { in: ['SCHEDULED', 'LIVE'] } }
  });
  if (activeTableCount >= PLAN_LIMITS[tier].maxActiveTables) {
    return c.json({ error: `Table limit reached for ${tier} plan` }, 409);
  }

  const table = await prisma.privateTable.create({
    data: {
      clubId,
      hostUserId: actorId,
      name: parsed.data.name,
      mode: parsed.data.mode,
      maxPlayers: parsed.data.maxPlayers,
      virtualBuyIn: parsed.data.virtualBuyIn,
      seats: {
        create: {
          userId: actorId,
          status: 'ACCEPTED',
          invitedByUserId: actorId
        }
      }
    },
    include: { seats: true }
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
  if (!(await requireClubMember(clubId, actorId))) {
    return c.json({ error: 'Club membership required' }, 403);
  }
  const tables = await prisma.privateTable.findMany({
    where: { clubId },
    include: {
      seats: {
        include: {
          user: { select: { id: true, nickname: true, displayName: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  return c.json({ tables, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRoutes.get('/:clubId/private-tables/:tableId', async (c) => {
  const clubId = c.req.param('clubId');
  const tableId = c.req.param('tableId');
  const actorId = c.get('auth').userId;
  if (!(await requireClubMember(clubId, actorId))) {
    return c.json({ error: 'Club membership required' }, 403);
  }
  const table = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId },
    include: {
      seats: {
        include: {
          user: { select: { id: true, nickname: true, displayName: true } }
        }
      }
    }
  });
  if (!table) return c.json({ error: 'Table not found' }, 404);
  return c.json({ table, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRoutes.post('/:clubId/private-tables/:tableId/invite', async (c) => {
  const clubId = c.req.param('clubId');
  const tableId = c.req.param('tableId');
  const actorId = c.get('auth').userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return c.json({ error: 'Admin role required' }, 403);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const targetUserId = await resolveTargetUserId(parsed.data);
  if (!targetUserId) return c.json({ error: 'User not found' }, 404);

  const table = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId, status: { in: ['SCHEDULED', 'LIVE'] } },
    include: { _count: { select: { seats: true } } }
  });
  if (!table) return c.json({ error: 'Table not found or closed' }, 404);

  const maxSeats = effectiveMaxPlayers(table.maxPlayers);
  if (table._count.seats >= maxSeats) {
    return c.json({ error: 'Table is full' }, 409);
  }

  const member = await requireClubMember(clubId, targetUserId);
  if (!member) {
    return c.json({ error: 'User must be a club member first' }, 400);
  }

  const seat = await prisma.privateTableSeat.upsert({
    where: { tableId_userId: { tableId, userId: targetUserId } },
    update: { status: 'INVITED', invitedByUserId: actorId },
    create: {
      tableId,
      userId: targetUserId,
      status: 'INVITED',
      invitedByUserId: actorId
    },
    include: {
      user: { select: { id: true, nickname: true, displayName: true } }
    }
  });

  return c.json({ seat }, 201);
});

clubsRoutes.post('/:clubId/private-tables/:tableId/accept', async (c) => {
  const clubId = c.req.param('clubId');
  const tableId = c.req.param('tableId');
  const userId = c.get('auth').userId;
  if (!(await requireClubMember(clubId, userId))) {
    return c.json({ error: 'Club membership required' }, 403);
  }

  const seat = await prisma.privateTableSeat.findUnique({
    where: { tableId_userId: { tableId, userId } }
  });
  if (!seat || seat.status !== 'INVITED') {
    return c.json({ error: 'No pending invite' }, 404);
  }

  const updated = await prisma.privateTableSeat.update({
    where: { id: seat.id },
    data: { status: 'ACCEPTED' }
  });
  return c.json({ seat: updated });
});

clubsRoutes.post('/:clubId/private-tables/:tableId/start', async (c) => {
  const clubId = c.req.param('clubId');
  const tableId = c.req.param('tableId');
  const actorId = c.get('auth').userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return c.json({ error: 'Admin role required' }, 403);
  }

  const table = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId }
  });
  if (!table) return c.json({ error: 'Table not found' }, 404);
  if (table.status === 'LIVE' && table.sessionId) {
    return c.json({ table, sessionId: table.sessionId });
  }
  if (table.status === 'CLOSED') {
    return c.json({ error: 'Table is closed' }, 409);
  }

  const sessionId = newSessionId('club');

  await prisma.privateTable.update({
    where: { id: tableId },
    data: {
      status: 'LIVE',
      sessionId,
      startsAt: new Date()
    }
  });

  await prisma.gameSession.create({
    data: {
      id: sessionId,
      mode: table.mode,
      status: 'LOBBY',
      players: [],
      buyIn: table.virtualBuyIn,
      rake: 0
    }
  });

  await joinTable(sessionId, table.hostUserId, table.mode, table.virtualBuyIn);

  await prisma.privateTableSeat.updateMany({
    where: { tableId, userId: table.hostUserId },
    data: { status: 'SEATED' }
  });

  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'private_table.started',
      details: { tableId, sessionId }
    }
  });

  const updated = await prisma.privateTable.findUnique({ where: { id: tableId } });
  return c.json({ table: updated, sessionId, disclaimer: NON_GAMBLING_DISCLAIMER });
});

clubsRoutes.post('/:clubId/private-tables/:tableId/join', async (c) => {
  const clubId = c.req.param('clubId');
  const tableId = c.req.param('tableId');
  const userId = c.get('auth').userId;

  const table = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId }
  });
  if (!table) return c.json({ error: 'Table not found' }, 404);
  if (table.status !== 'LIVE' || !table.sessionId) {
    return c.json({ error: 'Table is not live yet' }, 409);
  }

  const membership = await requireClubMember(clubId, userId);
  const isAdmin =
    membership &&
    (membership.role === 'OWNER' || membership.role === 'ADMIN' || table.hostUserId === userId);

  const seat = await prisma.privateTableSeat.findUnique({
    where: { tableId_userId: { tableId, userId } }
  });

  if (!isAdmin && (!seat || (seat.status !== 'ACCEPTED' && seat.status !== 'SEATED'))) {
    return c.json({ error: 'Invite required to join this table' }, 403);
  }

  const state = await joinTable(table.sessionId, userId, table.mode, table.virtualBuyIn);

  if (seat) {
    await prisma.privateTableSeat.update({
      where: { id: seat.id },
      data: { status: 'SEATED' }
    });
  }

  return c.json({
    sessionId: table.sessionId,
    players: state.players,
    disclaimer: NON_GAMBLING_DISCLAIMER
  });
});

clubsRoutes.post('/:clubId/private-tables/:tableId/close', async (c) => {
  const clubId = c.req.param('clubId');
  const tableId = c.req.param('tableId');
  const actorId = c.get('auth').userId;
  if (!(await requireClubAdmin(clubId, actorId))) {
    return c.json({ error: 'Admin role required' }, 403);
  }

  const existing = await prisma.privateTable.findFirst({
    where: { id: tableId, clubId }
  });
  if (!existing) return c.json({ error: 'Table not found' }, 404);

  const table = await prisma.privateTable.update({
    where: { id: tableId },
    data: { status: 'CLOSED', closedAt: new Date() }
  });

  if (table.sessionId) {
    await prisma.gameSession.updateMany({
      where: { id: table.sessionId },
      data: { status: 'FINISHED', finishedAt: new Date() }
    });
  }

  await prisma.complianceEvent.create({
    data: {
      clubId,
      actorUserId: actorId,
      type: 'private_table.closed',
      details: { tableId }
    }
  });

  return c.json({ table, disclaimer: NON_GAMBLING_DISCLAIMER });
});

/** Accept invite by code (for /invite/:code page) */
clubsRoutes.post('/invite/:inviteCode/accept', async (c) => {
  const inviteCode = c.req.param('inviteCode');
  const userId = c.get('auth').userId;

  const table = await prisma.privateTable.findUnique({ where: { inviteCode } });
  if (!table) return c.json({ error: 'Invite not found' }, 404);

  const member = await requireClubMember(table.clubId, userId);
  if (!member) return c.json({ error: 'Club membership required' }, 403);

  const seat = await prisma.privateTableSeat.upsert({
    where: { tableId_userId: { tableId: table.id, userId } },
    update: { status: 'ACCEPTED' },
    create: {
      tableId: table.id,
      userId,
      status: 'ACCEPTED',
      invitedByUserId: table.hostUserId
    }
  });

  return c.json({ seat, tableId: table.id, clubId: table.clubId });
});
