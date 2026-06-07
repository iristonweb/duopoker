import { Hono } from 'hono';
import { z } from 'zod';
import { sanitizeSessionForUser } from '../services/sanitize-session.js';
import { authGuard } from '../middleware/auth.js';
import { getSessionPlayerProfiles } from '../services/private-table-auth.js';
import { assertCanJoinSession } from '../services/session-access.js';
import {
  enterMatchmaking,
  getQueueStatus,
  getSessionSnapshot,
  joinTable,
  leaveQueue,
  leaveTable,
  matchmakingAllowsSolo,
  processPlayerAction,
  requestNextHand,
  tickSession
} from '../services/game-session.js';
import {
  getUserVipNotifications,
  respondVipInvite
} from '../services/vip-table.js';
import { listLiveTableInvites, listPendingTableInvites } from '../services/table-invites.js';
import { prisma } from '../lib/prisma.js';
import { normalizeGameMode } from '@duopoker/shared-types/index';

const gameModeSchema = z.preprocess(
  (v) => (typeof v === 'string' ? normalizeGameMode(v as 'HOLDEM' | 'JOKER' | 'RASPISNOY') : v),
  z.enum(['HOLDEM', 'JOKER'])
);

const queueSchema = z.object({
  mode: gameModeSchema,
  buyIn: z.number().int().positive(),
  opponent: z.enum(['human', 'bot']).optional().default('human'),
  playerCount: z.number().int().min(2).max(6).optional().default(2),
  jokerRules: z
    .object({
      strictJoker: z.boolean().optional(),
      scoringMode: z.enum(['classic', 'minus']).optional()
    })
    .optional()
});

const joinSchema = z.object({
  sessionId: z.string().min(1),
  mode: gameModeSchema.default('HOLDEM'),
  buyIn: z.number().int().positive().default(100)
});

const actionSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['bet', 'check', 'fold', 'call', 'raise', 'bid', 'playCard', 'chooseTrump']),
  amount: z.number().int().nonnegative().optional(),
  raiseBy: z.number().int().nonnegative().optional(),
  card: z
    .string()
    .regex(/^[6-9TJQKA][SHDC]$/)
    .optional(),
  trumpSuit: z.enum(['S', 'H', 'D', 'C']).nullable().optional(),
  declaration: z
    .union([
      z.enum(['nominal', 'senior', 'minor']),
      z.object({
        suit: z.enum(['S', 'H', 'D', 'C']),
        rankMode: z.enum(['senior', 'minor'])
      })
    ])
    .optional(),
  at: z.number().default(() => Date.now())
});

const readySchema = z.object({
  sessionId: z.string().min(1)
});

const leaveSchema = z.object({
  sessionId: z.string().min(1)
});

export const gameRoutes = new Hono();

gameRoutes.use('*', authGuard);

gameRoutes.get('/queue/status', async (c) => {
  const userId = c.get('auth').userId;
  const status = await getQueueStatus(userId);
  return c.json(status);
});

gameRoutes.get('/vip-invites', async (c) => {
  const userId = c.get('auth').userId;
  const { pending, live } = await getUserVipNotifications(userId);
  return c.json({
    invites: pending.map((inv) => ({
      id: inv.id,
      duelId: inv.duelId,
      message: inv.duel.message,
      mode: inv.duel.mode,
      buyIn: inv.duel.buyIn,
      expiresAt: inv.duel.expiresAt,
      host: inv.duel.host
    })),
    liveSession: live
  });
});

gameRoutes.get('/table-invites', async (c) => {
  const userId = c.get('auth').userId;
  const [invites, liveTables] = await Promise.all([
    listPendingTableInvites(userId),
    listLiveTableInvites(userId)
  ]);
  return c.json({ invites, liveTables });
});

gameRoutes.post('/vip-invites/:duelId/accept', async (c) => {
  const result = await respondVipInvite(c.get('auth').userId, c.req.param('duelId'), true);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

gameRoutes.post('/vip-invites/:duelId/decline', async (c) => {
  const result = await respondVipInvite(c.get('auth').userId, c.req.param('duelId'), false);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

gameRoutes.post('/table-invites/:seatId/decline', async (c) => {
  const userId = c.get('auth').userId;
  const seatId = c.req.param('seatId');

  const seat = await prisma.privateTableSeat.findFirst({
    where: { id: seatId, userId, status: 'INVITED' }
  });
  if (!seat) return c.json({ error: 'Invite not found' }, 404);

  await prisma.privateTableSeat.update({
    where: { id: seatId },
    data: { status: 'DECLINED' }
  });

  return c.json({ ok: true });
});

gameRoutes.post('/queue', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = queueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { opponent, playerCount, jokerRules, ...ticketFields } = parsed.data;
  const result = await enterMatchmaking(
    { userId, ...ticketFields, createdAt: Date.now() },
    {
      allowSoloQueue: matchmakingAllowsSolo(),
      opponent,
      playerCount: opponent === 'bot' ? playerCount : undefined,
      jokerRules
    }
  );

  return c.json(result);
});

gameRoutes.delete('/queue', async (c) => {
  const userId = c.get('auth').userId;
  await leaveQueue(userId);
  return c.body(null, 204);
});

gameRoutes.post('/leave', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten(), code: 'INVALID_LEAVE_PAYLOAD' }, 400);
  }

  const result = await leaveTable(parsed.data.sessionId, userId);
  if (!result.ok) {
    return c.json({ error: result.reason, code: result.reason }, 400);
  }

  const ticked = await tickSession(parsed.data.sessionId);
  const outState = ticked ?? result.state;
  return c.json({ session: await sanitizeSessionForUser(outState, userId), left: true });
});

gameRoutes.post('/join', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten(), code: 'INVALID_JOIN_PAYLOAD' }, 400);
  }

  const { sessionId, mode, buyIn } = parsed.data;

  const access = await assertCanJoinSession(sessionId, userId);
  if (!access.ok) {
    return c.json({ error: access.reason, code: access.reason }, 403);
  }

  let state = await joinTable(sessionId, userId, mode, buyIn);
  const ticked = await tickSession(sessionId);
  if (ticked) state = ticked;

  return c.json({
    session: await sanitizeSessionForUser(state, userId)
  });
});

gameRoutes.post('/action', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten(), code: 'INVALID_ACTION_PAYLOAD' }, 400);
  }

  const result = await processPlayerAction({ ...parsed.data, userId });
  if (result.rejected) {
    return c.json({ error: result.reason, code: result.reason }, 400);
  }

  let outState = result.state;
  const ticked = await tickSession(parsed.data.sessionId);
  if (ticked) outState = ticked;

  return c.json({
    session: await sanitizeSessionForUser(outState, userId),
    replay: result.replay
  });
});

gameRoutes.post('/ready-next-hand', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = readySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const result = await requestNextHand(parsed.data.sessionId, userId);
  if (!result.ok) {
    return c.json({ error: result.reason, code: result.reason }, 400);
  }

  let out = result.state;
  if (result.started) {
    const ticked = await tickSession(parsed.data.sessionId);
    if (ticked) out = ticked;
  }

  return c.json({
    session: await sanitizeSessionForUser(out, userId),
    started: result.started
  });
});

gameRoutes.get('/session/:sessionId', async (c) => {
  const userId = c.get('auth').userId;
  const sessionId = c.req.param('sessionId');
  let snapshot = await getSessionSnapshot(sessionId);
  if (!snapshot) {
    return c.json({ session: null }, 404);
  }
  if (!snapshot.players.includes(userId)) {
    return c.json({ error: 'Not seated at this table' }, 403);
  }
  const ticked = await tickSession(sessionId);
  if (ticked) snapshot = ticked;
  return c.json({
    session: await sanitizeSessionForUser(snapshot, userId)
  });
});

gameRoutes.get('/session/:sessionId/players', async (c) => {
  const userId = c.get('auth').userId;
  const sessionId = c.req.param('sessionId');
  const snapshot = await getSessionSnapshot(sessionId);
  if (!snapshot) {
    return c.json({ error: 'Session not found' }, 404);
  }
  if (!snapshot.players.includes(userId)) {
    return c.json({ error: 'Not seated at this table' }, 403);
  }
  const players = await getSessionPlayerProfiles(snapshot.players);
  return c.json({ players });
});
