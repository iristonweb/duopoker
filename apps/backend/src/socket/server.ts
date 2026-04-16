import { createServer } from 'node:http';
import type { Express } from 'express';
import { Server } from 'socket.io';
import { z } from 'zod';
import { config } from '../config.js';
import { redis } from '../services/redis.js';
import { getMongoDb } from '../services/mongo.js';
import {
  enqueueMatchmaking,
  getSessionSnapshot,
  joinTable,
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

/** userId -> socket ids (tabs / reconnects) */
const userToSockets = new Map<string, Set<string>>();

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

    socket.on('disconnect', () => {
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
      registerUserSocket(userId, socket.id);
      await socket.join(sessionId);
      const state = joinTable(sessionId, userId, mode, buyIn);
      await redis.publish(`lobby:${sessionId}`, JSON.stringify({ type: 'join', userId }));
      io.to(sessionId).emit('sessionEvent', { type: 'PLAYER_JOINED', userId, state });
      io.to(sessionId).emit('stateUpdate', state);
    });

    socket.on('playerAction', async (payload) => {
      const parsed = actionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_ACTION_PAYLOAD' });
        return;
      }

      const result = await processPlayerAction({
        ...parsed.data,
        userId: socket.data.userId ?? parsed.data.userId
      });
      if (result.rejected) {
        socket.emit('sessionError', { code: result.reason });
        return;
      }

      await replayCollection.insertOne({
        sessionId: parsed.data.sessionId,
        action: parsed.data,
        createdAt: new Date(parsed.data.at)
      });
      await redis.publish(`game:${parsed.data.sessionId}`, JSON.stringify(parsed.data));
      io.to(parsed.data.sessionId).emit('stateUpdate', result.state);
      io.to(parsed.data.sessionId).emit('reconciliation', { replay: result.replay });
    });

    socket.on('reconnectSession', async ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      const snapshot = await getSessionSnapshot(sessionId);
      socket.emit('sessionReconnected', { sessionId, snapshot });
      if (snapshot) {
        socket.emit('stateUpdate', snapshot);
      }
    });

    socket.on('readyNextHand', ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId || typeof sessionId !== 'string') return;
      const result = requestNextHand(sessionId);
      if (!result.ok) {
        socket.emit('sessionError', { code: result.reason });
        return;
      }
      io.to(sessionId).emit('stateUpdate', result.state);
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
      const ready = enqueueMatchmaking({
        ...parsed.data,
        userId,
        createdAt: Date.now()
      });
      if (!ready) return;
      const match = {
        sessionId: `sess-${Date.now()}`,
        players: ready.map((r) => r.userId),
        mode: parsed.data.mode,
        buyIn: parsed.data.buyIn
      };
      emitMatchFoundToPlayers(io, match);
    });
  });

  return { httpServer, io };
};
