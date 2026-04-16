import { createServer } from 'node:http';
import type { Express } from 'express';
import { Server } from 'socket.io';
import { z } from 'zod';
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

export const createRealtimeServer = (app: Express) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });
  attachOptionalSocketAuth(io);
  const replayCollection = getMongoDb().collection('replays');
  const sub = redis.duplicate();
  sub.subscribe('matchmaking:ready');
  sub.on('message', (_channel, message) => {
    io.emit('matchFound', JSON.parse(message));
  });

  setInterval(() => {
    io.emit('tick', { at: Date.now() });
  }, 33);

  io.on('connection', (socket) => {
    socket.on('joinSession', async (payload) => {
      const joined = joinSchema.safeParse(payload);
      if (!joined.success) {
        socket.emit('sessionError', { code: 'INVALID_JOIN_PAYLOAD' });
        return;
      }

      const { sessionId, mode, buyIn } = joined.data;
      const userId = socket.data.userId ?? joined.data.userId;
      await socket.join(sessionId);
      const state = joinTable(sessionId, userId, mode, buyIn);
      await redis.publish(`lobby:${sessionId}`, JSON.stringify({ type: 'join', userId }));
      io.to(sessionId).emit('sessionEvent', { type: 'PLAYER_JOINED', userId, state });
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

    socket.on('reconnectSession', async ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      const snapshot = await getSessionSnapshot(sessionId);
      socket.emit('sessionReconnected', { sessionId, snapshot });
    });

    socket.on('readyNextHand', ({ sessionId }) => {
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
      const ready = enqueueMatchmaking({
        ...parsed.data,
        userId: socket.data.userId ?? parsed.data.userId,
        createdAt: Date.now()
      });
      if (!ready) return;
      const match = {
        sessionId: `sess-${Date.now()}`,
        players: ready.map((r) => r.userId),
        mode: parsed.data.mode,
        buyIn: parsed.data.buyIn
      };
      await redis.publish('matchmaking:ready', JSON.stringify(match));
    });
  });

  return { httpServer, io };
};
