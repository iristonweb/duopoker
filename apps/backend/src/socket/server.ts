import { createServer } from 'node:http';
import type { Express } from 'express';
import { Server } from 'socket.io';
import { z } from 'zod';
import { redis } from '../services/redis.js';
import { getMongoDb } from '../services/mongo.js';
import { enqueueMatchmaking, ensureSessionState, getSessionSnapshot, processPlayerAction } from '../services/game-session.js';

const joinSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  mode: z.enum(['HOLDEM', 'RASPISNOY']).default('HOLDEM')
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

      const { sessionId, userId, mode } = joined.data;
      await socket.join(sessionId);
      const state = ensureSessionState(sessionId, mode);
      await redis.publish(`lobby:${sessionId}`, JSON.stringify({ type: 'join', userId }));
      io.to(sessionId).emit('sessionEvent', { type: 'PLAYER_JOINED', userId, state });
    });

    socket.on('playerAction', async (payload) => {
      const parsed = actionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_ACTION_PAYLOAD' });
        return;
      }

      const result = processPlayerAction(parsed.data);
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

    socket.on('reconnectSession', ({ sessionId }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      socket.emit('sessionReconnected', { sessionId, snapshot: getSessionSnapshot(sessionId) });
    });

    socket.on('queueMatchmaking', async (payload) => {
      const parsed = matchmakingSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_MATCHMAKING_PAYLOAD' });
        return;
      }
      const ready = enqueueMatchmaking({ ...parsed.data, createdAt: Date.now() });
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
