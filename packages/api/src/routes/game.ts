import { Hono } from 'hono';
import { z } from 'zod';
import { sanitizeStateForViewer } from '@duopoker/game-engine/index';
import { authGuard } from '../middleware/auth.js';
import { canJoinPrivateSession, getSessionPlayerProfiles } from '../services/private-table-auth.js';
import {
  advanceBotTurns,
  enterMatchmaking,
  getQueueStatus,
  getSessionSnapshot,
  joinTable,
  leaveQueue,
  matchmakingAllowsSolo,
  processPlayerAction,
  requestNextHand
} from '../services/game-session.js';

const queueSchema = z.object({
  mode: z.enum(['HOLDEM', 'RASPISNOY']),
  buyIn: z.number().int().positive(),
  opponent: z.enum(['human', 'bot']).optional().default('human'),
  playerCount: z.number().int().min(2).max(6).optional().default(2)
});

const joinSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.enum(['HOLDEM', 'RASPISNOY']).default('HOLDEM'),
  buyIn: z.number().int().positive().default(100)
});

const actionSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['bet', 'check', 'fold', 'call', 'raise']),
  amount: z.number().int().nonnegative().optional(),
  at: z.number().default(() => Date.now())
});

const readySchema = z.object({
  sessionId: z.string().min(1)
});

export const gameRoutes = new Hono();

gameRoutes.use('*', authGuard);

gameRoutes.get('/queue/status', async (c) => {
  const userId = c.get('auth').userId;
  const status = await getQueueStatus(userId);
  return c.json(status);
});

gameRoutes.post('/queue', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = queueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const { opponent, playerCount, ...ticketFields } = parsed.data;
  const result = await enterMatchmaking(
    { userId, ...ticketFields, createdAt: Date.now() },
    {
      allowSoloQueue: matchmakingAllowsSolo(),
      opponent,
      playerCount: opponent === 'bot' ? playerCount : undefined
    }
  );

  return c.json(result);
});

gameRoutes.delete('/queue', async (c) => {
  const userId = c.get('auth').userId;
  await leaveQueue(userId);
  return c.body(null, 204);
});

gameRoutes.post('/join', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten(), code: 'INVALID_JOIN_PAYLOAD' }, 400);
  }

  const { sessionId, mode, buyIn } = parsed.data;

  const access = await canJoinPrivateSession(sessionId, userId);
  if (!access.ok) {
    return c.json({ error: access.reason, code: access.reason }, 403);
  }

  let state = await joinTable(sessionId, userId, mode, buyIn);
  const botState = await advanceBotTurns(sessionId);
  if (botState) state = botState;

  return c.json({
    session: sanitizeStateForViewer(state, userId)
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
  const botState = await advanceBotTurns(parsed.data.sessionId);
  if (botState) outState = botState;

  return c.json({
    session: sanitizeStateForViewer(outState, userId),
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
    const botState = await advanceBotTurns(parsed.data.sessionId);
    if (botState) out = botState;
  }

  return c.json({
    session: sanitizeStateForViewer(out, userId),
    started: result.started
  });
});

gameRoutes.get('/session/:sessionId', async (c) => {
  const userId = c.get('auth').userId;
  const sessionId = c.req.param('sessionId');
  const snapshot = await getSessionSnapshot(sessionId);
  if (!snapshot) {
    return c.json({ session: null }, 404);
  }
  if (!snapshot.players.includes(userId)) {
    return c.json({ error: 'Not seated at this table' }, 403);
  }
  return c.json({
    session: sanitizeStateForViewer(snapshot, userId)
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
