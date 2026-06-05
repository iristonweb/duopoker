import { createServer } from 'node:http';
import type { Express } from 'express';
import { Server } from 'socket.io';
import { z } from 'zod';
import { sanitizeStateForViewer } from '@duopoker/game-engine/index';
import type { SessionState } from '@duopoker/shared-types/index';
import { config } from '../config.js';
import { redis } from '../services/redis.js';
import { getMongoDb, isMongoReady } from '../services/mongo.js';
import { canJoinPrivateSession } from '../services/private-table-auth.js';
import {
  advanceBotTurns,
  enqueueMatchmaking,
  foldActivePlayerOnTimeout,
  getSessionSnapshot,
  joinTable,
  listSessionIdsForUser,
  processPlayerAction,
  requestNextHand
} from '../services/game-session.js';
import { attachOptionalSocketAuth } from './socket-auth.js';

const joinSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  mode: z.enum(['HOLDEM', 'RASPISNOY']).default('HOLDEM'),
  buyIn: z.number().int().positive().default(100)
});

const actionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  type: z.enum(['bet', 'check', 'fold', 'call', 'raise']),
  amount: z.number().int().nonnegative().optional(),
  at: z.number().default(() => Date.now())
});

const matchmakingSchema = z.object({
  userId: z.string().min(1),
  mode: z.enum(['HOLDEM', 'RASPISNOY']),
  buyIn: z.number().int().positive()
});

const BOT_PREFIX = 'duopoker-bot';
const ACTION_TIMEOUT_MS = 30_000;

/** userId -> socket ids (tabs / reconnects) */
const userToSockets = new Map<string, Set<string>>();
const actionTimers = new Map<string, ReturnType<typeof setTimeout>>();

const registerUserSocket = (userId: string, socketId: string) => {
  let set = userToSockets.get(userId);
  if (!set) {
    set = new Set();
    userToSockets.set(userId, set);
  }
  set.add(socketId);
};

const unregisterSocketEverywhere = (socketId: string) => {
  for (const [uid, set] of userToSockets) {
    set.delete(socketId);
    if (set.size === 0) {
      userToSockets.delete(uid);
    }
  }
};

const clearActionTimer = (sessionId: string) => {
  const t = actionTimers.get(sessionId);
  if (t) clearTimeout(t);
  actionTimers.delete(sessionId);
};

const emitStateToSession = async (io: Server, sessionId: string, state: SessionState) => {
  const sockets = await io.in(sessionId).fetchSockets();
  for (const s of sockets) {
    const viewerId = typeof s.data.userId === 'string' ? s.data.userId : undefined;
    s.emit('stateUpdate', sanitizeStateForViewer(state, viewerId));
  }
};

const scheduleActionTimer = (io: Server, sessionId: string, state: SessionState) => {
  clearActionTimer(sessionId);
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return;
  }
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId || activeId.startsWith(BOT_PREFIX)) return;

  actionTimers.set(
    sessionId,
    setTimeout(async () => {
      const next = await foldActivePlayerOnTimeout(sessionId, activeId);
      if (next) {
        await emitStateToSession(io, sessionId, next);
        scheduleActionTimer(io, sessionId, next);
      }
    }, ACTION_TIMEOUT_MS)
  );
};

const broadcastSessionState = async (io: Server, sessionId: string, state: SessionState) => {
  await emitStateToSession(io, sessionId, state);
  scheduleActionTimer(io, sessionId, state);
};

const emitMatchFoundToPlayers = (
  io: Server,
  match: { sessionId: string; players: string[]; mode: string; buyIn: number }
) => {
  const payload = {
    sessionId: match.sessionId,
    buyIn: match.buyIn,
    mode: match.mode
  };
  for (const userId of match.players) {
    const set = userToSockets.get(userId);
    if (!set) continue;
    for (const socketId of set) {
      io.to(socketId).emit('matchFound', payload);
    }
  }
};

export const createRealtimeServer = (app: Express) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin === true ? true : config.corsOrigin,
      credentials: true
    }
  });
  attachOptionalSocketAuth(io);
  const replayCollection = getMongoDb().collection('replays');

  io.on('connection', (socket) => {
    if (socket.data.userId) {
      registerUserSocket(socket.data.userId, socket.id);
    }

    socket.on('disconnect', async () => {
      const userId = typeof socket.data.userId === 'string' ? socket.data.userId : undefined;
      if (userId) {
        for (const sessionId of listSessionIdsForUser(userId)) {
          const next = await foldActivePlayerOnTimeout(sessionId, userId);
          if (next) {
            await broadcastSessionState(io, sessionId, next);
          }
        }
      }
      unregisterSocketEverywhere(socket.id);
    });

    socket.on('joinSession', async (payload) => {
      const joined = joinSchema.safeParse(payload);
      if (!joined.success) {
        socket.emit('sessionError', { code: 'INVALID_JOIN_PAYLOAD' });
        return;
      }

      const { sessionId, mode, buyIn } = joined.data;
      const userId = socket.data.userId ?? joined.data.userId;

      const access = await canJoinPrivateSession(sessionId, userId);
      if (!access.ok) {
        socket.emit('sessionError', { code: access.reason });
        return;
      }

      registerUserSocket(userId, socket.id);
      await socket.join(sessionId);
      const state = joinTable(sessionId, userId, mode, buyIn);
      await redis.publish(`lobby:${sessionId}`, JSON.stringify({ type: 'join', userId }));
      socket.emit('sessionEvent', {
        type: 'PLAYER_JOINED',
        userId,
        state: sanitizeStateForViewer(state, userId)
      });
      await broadcastSessionState(io, sessionId, state);
    });

    socket.on('playerAction', async (payload) => {
      const parsed = actionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_ACTION_PAYLOAD' });
        return;
      }

      clearActionTimer(parsed.data.sessionId);

      const result = await processPlayerAction({
        ...parsed.data,
        userId: socket.data.userId ?? parsed.data.userId
      });
      if (result.rejected) {
        socket.emit('sessionError', { code: result.reason });
        return;
      }

      let outState = result.state;
      const botState = await advanceBotTurns(parsed.data.sessionId);
      if (botState) {
        outState = botState;
      }

      if (isMongoReady()) {
        try {
          await replayCollection.insertOne({
            sessionId: parsed.data.sessionId,
            action: parsed.data,
            createdAt: new Date(parsed.data.at)
          });
        } catch (e) {
          console.warn('[mongo] replay insert skipped:', e);
        }
      }
      await redis.publish(`game:${parsed.data.sessionId}`, JSON.stringify(parsed.data));
      await broadcastSessionState(io, parsed.data.sessionId, outState);
      io.to(parsed.data.sessionId).emit('reconciliation', { replay: result.replay });
    });

    socket.on('reconnectSession', async ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      const snapshot = await getSessionSnapshot(sessionId);
      const viewerId = typeof socket.data.userId === 'string' ? socket.data.userId : undefined;
      socket.emit('sessionReconnected', {
        sessionId,
        snapshot: snapshot ? sanitizeStateForViewer(snapshot, viewerId) : null
      });
      if (snapshot) {
        socket.emit('stateUpdate', sanitizeStateForViewer(snapshot, viewerId));
        scheduleActionTimer(io, sessionId, snapshot);
      }
    });

    socket.on('readyNextHand', async ({ sessionId, userId: payloadUserId }: { sessionId?: string; userId?: string }) => {
      if (!sessionId || typeof sessionId !== 'string') return;
      const userId =
        typeof socket.data.userId === 'string'
          ? socket.data.userId
          : typeof payloadUserId === 'string'
            ? payloadUserId
            : undefined;
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }
      const result = requestNextHand(sessionId, userId);
      if (!result.ok) {
        socket.emit('sessionError', { code: result.reason });
        return;
      }
      let out = result.state;
      if (result.started) {
        const botState = await advanceBotTurns(sessionId);
        if (botState) out = botState;
      }
      await broadcastSessionState(io, sessionId, out);
    });

    socket.on('voiceSignal', (payload: Record<string, unknown>) => {
      const sid = typeof payload.sessionId === 'string' ? payload.sessionId : '';
      if (!sid) return;
      socket.to(sid).emit('voiceSignal', { ...payload, from: socket.id });
    });

    socket.on('queueMatchmaking', async (payload) => {
      const parsed = matchmakingSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_MATCHMAKING_PAYLOAD' });
        return;
      }
      const userId = socket.data.userId ?? parsed.data.userId;
      registerUserSocket(userId, socket.id);
      const ready = enqueueMatchmaking(
        {
          ...parsed.data,
          userId,
          createdAt: Date.now()
        },
        { allowSoloQueue: config.allowSoloQueue }
      );
      if (!ready) {
        socket.emit('matchmakingWaiting', {
          mode: parsed.data.mode,
          buyIn: parsed.data.buyIn
        });
        return;
      }
      const match = {
        sessionId: `sess-${Date.now()}`,
        players: ready.map((r) => r.userId),
        mode: parsed.data.mode,
        buyIn: parsed.data.buyIn
      };
      const hasBot = match.players.some((id) => id.startsWith(BOT_PREFIX));
      if (hasBot) {
        const humanId = match.players.find((id) => !id.startsWith(BOT_PREFIX))!;
        const botId = match.players.find((id) => id.startsWith(BOT_PREFIX))!;
        joinTable(match.sessionId, humanId, match.mode as 'HOLDEM' | 'RASPISNOY', match.buyIn);
        joinTable(match.sessionId, botId, match.mode as 'HOLDEM' | 'RASPISNOY', match.buyIn);
        const botState = await advanceBotTurns(match.sessionId);
        if (botState) {
          await broadcastSessionState(io, match.sessionId, botState);
        }
      }
      emitMatchFoundToPlayers(io, match);
    });
  });

  return { httpServer, io };
};
