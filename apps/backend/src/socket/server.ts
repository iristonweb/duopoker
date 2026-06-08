import { createServer } from 'node:http';
import type { Express } from 'express';
import { Server } from 'socket.io';
import { z } from 'zod';
import { sanitizeStateForViewer } from '@duopoker/game-engine/index';
import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { normalizeGameMode } from '@duopoker/shared-types/index';
import { config } from '../config.js';
import { redis } from '../services/redis.js';
import { getMongoDb, isMongoReady } from '../services/mongo.js';
import { getSubscriptionTiersBatch, getUserSubscriptionTier } from '../services/subscription-tier.js';
import { assertCanJoinSession, newSessionId } from '../services/session-access.js';
import {
  autoStartNextHand,
  enqueueMatchmaking,
  foldActivePlayerOnTimeout,
  getSessionSnapshot,
  joinTable,
  leaveTable,
  processPlayerAction,
  requestNextHand,
  seatPlayersBatch,
  tickSession
} from '../services/game-session.js';
import {
  ACTION_TIMEOUT_MS,
  NEXT_HAND_DELAY_MS,
  playersWithChips
} from '@duopoker/game-engine/index';
import { attachSocketAuth, resolveUserId } from './socket-auth.js';
import { resolveChatSender } from '../services/chat-profile.js';
import {
  appendTableChatMessage,
  canSendTableChat,
  clearTableChatSession,
  createTableChatMessage,
  getTableChatHistory,
  markTableChatSent
} from '../services/table-chat.js';

const gameModeSchema = z.preprocess(
  (v) => (typeof v === 'string' ? normalizeGameMode(v as 'HOLDEM' | 'JOKER' | 'RASPISNOY') : v),
  z.enum(['HOLDEM', 'JOKER'])
);

const joinSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  mode: gameModeSchema.default('HOLDEM'),
  buyIn: z.number().int().positive().default(100)
});

const actionSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
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

const matchmakingSchema = z.object({
  userId: z.string().min(1),
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

const BOT_PREFIX = 'duopoker-bot';

/** userId -> socket ids (tabs / reconnects) */
const userToSockets = new Map<string, Set<string>>();
const actionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextHandTimers = new Map<string, ReturnType<typeof setTimeout>>();
const botTickTimers = new Map<string, ReturnType<typeof setTimeout>>();
const botTickRetries = new Map<string, number>();

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

const clearNextHandTimer = (sessionId: string) => {
  const t = nextHandTimers.get(sessionId);
  if (t) clearTimeout(t);
  nextHandTimers.delete(sessionId);
};

const clearActionTimer = (sessionId: string) => {
  const t = actionTimers.get(sessionId);
  if (t) clearTimeout(t);
  actionTimers.delete(sessionId);
};

const clearBotTickTimer = (sessionId: string) => {
  const t = botTickTimers.get(sessionId);
  if (t) clearTimeout(t);
  botTickTimers.delete(sessionId);
  botTickRetries.delete(sessionId);
};

const scheduleBotTickRetry = (io: Server, sessionId: string, state: SessionState) => {
  clearBotTickTimer(sessionId);
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId?.startsWith(BOT_PREFIX)) return;
  if (state.street !== 'BIDDING' && state.street !== 'TRICKS') return;

  botTickRetries.set(sessionId, 0);
  const run = async () => {
    const next = await tickSession(sessionId);
    if (!next) return;
    await emitStateToSession(io, sessionId, next);
    scheduleActionTimer(io, sessionId, next);
    scheduleNextHandTimer(io, sessionId, next);

    const stillBot = next.players[next.activePlayerIndex]?.startsWith(BOT_PREFIX);
    const stillActive =
      stillBot && (next.street === 'BIDDING' || next.street === 'TRICKS');
    const retries = (botTickRetries.get(sessionId) ?? 0) + 1;
    if (stillActive && retries < 3) {
      botTickRetries.set(sessionId, retries);
      botTickTimers.set(sessionId, setTimeout(() => void run(), 500));
    } else {
      clearBotTickTimer(sessionId);
    }
  };

  botTickTimers.set(sessionId, setTimeout(() => void run(), 500));
};

const emitStateToSession = async (io: Server, sessionId: string, state: SessionState) => {
  const sockets = await io.in(sessionId).fetchSockets();
  const viewerIds = sockets
    .map((s) => (typeof s.data.userId === 'string' ? s.data.userId : undefined))
    .filter((id): id is string => Boolean(id));
  const tiers = await getSubscriptionTiersBatch(viewerIds);
  for (const s of sockets) {
    const viewerId = typeof s.data.userId === 'string' ? s.data.userId : undefined;
    const subscriptionTier = viewerId ? tiers.get(viewerId) ?? 'FREE' : 'FREE';
    s.emit('stateUpdate', sanitizeStateForViewer(state, viewerId, { subscriptionTier }));
  }
};

const scheduleActionTimer = (io: Server, sessionId: string, state: SessionState) => {
  clearActionTimer(sessionId);
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return;
  }
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId || activeId.startsWith(BOT_PREFIX)) return;

  const deadline = state.actionDeadlineAt ?? Date.now() + ACTION_TIMEOUT_MS;
  const delay = Math.max(0, deadline - Date.now());

  actionTimers.set(
    sessionId,
    setTimeout(async () => {
      const next = await foldActivePlayerOnTimeout(sessionId, activeId);
      if (next) {
        await broadcastSessionState(io, sessionId, next);
      }
    }, delay)
  );
};

const scheduleNextHandTimer = (io: Server, sessionId: string, state: SessionState) => {
  clearNextHandTimer(sessionId);
  if (state.street !== 'COMPLETE') return;
  if (playersWithChips(state).length < 2) return;

  const completedAt = state.handCompletedAt ?? Date.now();
  const delay = Math.max(0, NEXT_HAND_DELAY_MS - (Date.now() - completedAt));

  nextHandTimers.set(
    sessionId,
    setTimeout(async () => {
      const next = await autoStartNextHand(sessionId);
      if (next) {
        await broadcastSessionState(io, sessionId, next);
      }
    }, delay)
  );
};

const broadcastSessionState = async (io: Server, sessionId: string, state: SessionState) => {
  let out = state;
  const ticked = await tickSession(sessionId);
  if (ticked) out = ticked;
  await emitStateToSession(io, sessionId, out);
  scheduleActionTimer(io, sessionId, out);
  scheduleNextHandTimer(io, sessionId, out);
  scheduleBotTickRetry(io, sessionId, out);
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

let globalIo: Server | null = null;

export const emitNotificationToUsers = (
  userIds: string[],
  event: string,
  payload: unknown
) => {
  if (!globalIo) return;
  for (const userId of userIds) {
    const set = userToSockets.get(userId);
    if (!set) continue;
    for (const socketId of set) {
      globalIo.to(socketId).emit(event, payload);
    }
  }
};

export const emitTableClosedToSession = (
  sessionId: string,
  payload: { clubId: string; tableId: string; sessionId: string }
) => {
  if (!globalIo) return;
  globalIo.to(sessionId).emit('tableClosed', payload);
};

export const createRealtimeServer = (app: Express) => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin === true ? true : config.corsOrigin,
      credentials: true
    }
  });
  globalIo = io;
  attachSocketAuth(io);
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
      const userId = resolveUserId(socket, joined.data.userId);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }

      const access = await assertCanJoinSession(sessionId, userId);
      if (!access.ok) {
        socket.emit('sessionError', { code: access.reason });
        return;
      }

      registerUserSocket(userId, socket.id);
      await socket.join(sessionId);
      const state = joinTable(sessionId, userId, mode, buyIn);
      await redis.publish(`lobby:${sessionId}`, JSON.stringify({ type: 'join', userId }));
      const subscriptionTier = await getUserSubscriptionTier(userId);
      socket.emit('sessionEvent', {
        type: 'PLAYER_JOINED',
        userId,
        state: sanitizeStateForViewer(state, userId, { subscriptionTier })
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

      const userId = resolveUserId(socket, parsed.data.userId);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }

      const action: PlayerAction = {
        sessionId: parsed.data.sessionId,
        userId,
        type: parsed.data.type,
        amount: parsed.data.amount,
        at: parsed.data.at,
        ...(parsed.data.card ? { card: parsed.data.card as Card } : {})
      };
      const result = await processPlayerAction(action);
      if (result.rejected) {
        socket.emit('sessionError', { code: result.reason });
        return;
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
      await broadcastSessionState(io, parsed.data.sessionId, result.state);
      io.to(parsed.data.sessionId).emit('reconciliation', { replay: result.replay });
    });

    socket.on('reconnectSession', async ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId) return;
      socket.join(sessionId);
      const snapshot = await tickSession(sessionId);
      const viewerId = typeof socket.data.userId === 'string' ? socket.data.userId : undefined;
      const subscriptionTier = viewerId ? await getUserSubscriptionTier(viewerId) : 'FREE';
      socket.emit('sessionReconnected', {
        sessionId,
        snapshot: snapshot ? sanitizeStateForViewer(snapshot, viewerId, { subscriptionTier }) : null
      });
      if (snapshot) {
        await broadcastSessionState(io, sessionId, snapshot);
      }
    });

    socket.on('readyNextHand', async ({ sessionId, userId: payloadUserId }: { sessionId?: string; userId?: string }) => {
      if (!sessionId || typeof sessionId !== 'string') return;
      const userId = resolveUserId(socket, payloadUserId);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }
      const result = requestNextHand(sessionId, userId);
      if (!result.ok) {
        socket.emit('sessionError', { code: result.reason });
        return;
      }
      await broadcastSessionState(io, sessionId, result.state);
    });

    socket.on('leaveTable', async ({ sessionId, userId: payloadUserId }: { sessionId?: string; userId?: string }) => {
      if (!sessionId || typeof sessionId !== 'string') return;
      const userId = resolveUserId(socket, payloadUserId);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }
      clearActionTimer(sessionId);
      const result = await leaveTable(sessionId, userId);
      if (!result.ok) {
        socket.emit('sessionError', { code: result.reason });
        return;
      }
      await socket.leave(sessionId);
      socket.emit('leftTable', { sessionId });
      const remaining = await io.in(sessionId).fetchSockets();
      if (remaining.length === 0) {
        clearTableChatSession(sessionId);
      }
      await broadcastSessionState(io, sessionId, result.state);
    });

    socket.on('voiceSignal', (payload: Record<string, unknown>) => {
      const sid = typeof payload.sessionId === 'string' ? payload.sessionId : '';
      if (!sid) return;
      socket.to(sid).emit('voiceSignal', { ...payload, from: socket.id });
    });

    const tableChatSendSchema = z.object({
      sessionId: z.string().min(1),
      text: z.string().trim().min(1).max(280)
    });

    const assertSocketInSession = async (sessionId: string) => {
      const sockets = await io.in(sessionId).fetchSockets();
      return sockets.some((s) => s.id === socket.id);
    };

    socket.on('tableChatJoin', async ({ sessionId }: { sessionId?: string }) => {
      if (!sessionId || typeof sessionId !== 'string') return;
      const userId = resolveUserId(socket, undefined);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }
      if (!(await assertSocketInSession(sessionId))) {
        socket.emit('sessionError', { code: 'NOT_IN_SESSION' });
        return;
      }
      socket.emit('tableChatHistory', {
        sessionId,
        messages: getTableChatHistory(sessionId)
      });
    });

    socket.on('tableChatSend', async (payload) => {
      const parsed = tableChatSendSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_CHAT_PAYLOAD' });
        return;
      }
      const userId = resolveUserId(socket, undefined);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }
      const { sessionId, text } = parsed.data;
      if (!canSendTableChat(userId, sessionId)) {
        socket.emit('sessionError', { code: 'CHAT_RATE_LIMIT' });
        return;
      }
      if (!(await assertSocketInSession(sessionId))) {
        socket.emit('sessionError', { code: 'NOT_IN_SESSION' });
        return;
      }
      markTableChatSent(userId, sessionId);
      const sender = await resolveChatSender(userId);
      const msg = createTableChatMessage({
        sessionId,
        userId,
        displayName: sender.displayName,
        avatar: sender.avatar,
        text
      });
      appendTableChatMessage(msg);
      io.to(sessionId).emit('tableChatMessage', msg);
    });

    socket.on('queueMatchmaking', async (payload) => {
      const parsed = matchmakingSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('sessionError', { code: 'INVALID_MATCHMAKING_PAYLOAD' });
        return;
      }
      const userId = resolveUserId(socket, parsed.data.userId);
      if (!userId) {
        socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
        return;
      }
      registerUserSocket(userId, socket.id);
      const { opponent, playerCount, jokerRules, ...ticketFields } = parsed.data;
      const ready = enqueueMatchmaking(
        {
          ...ticketFields,
          userId,
          createdAt: Date.now()
        },
        {
          allowSoloQueue: config.allowSoloQueue,
          opponent,
          playerCount: opponent === 'bot' ? playerCount : undefined
        }
      );
      if (!ready) {
        socket.emit('matchmakingWaiting', {
          mode: parsed.data.mode,
          buyIn: parsed.data.buyIn
        });
        return;
      }
      const match = {
        sessionId: newSessionId(),
        players: ready.map((r) => r.userId),
        mode: parsed.data.mode,
        buyIn: parsed.data.buyIn
      };
      seatPlayersBatch(
        match.sessionId,
        match.players,
        match.mode as 'HOLDEM' | 'JOKER',
        match.buyIn,
        jokerRules
      );
      const initial = await getSessionSnapshot(match.sessionId);
      if (initial) {
        await broadcastSessionState(io, match.sessionId, initial);
      }
      emitMatchFoundToPlayers(io, match);
    });
  });

  return { httpServer, io };
};
