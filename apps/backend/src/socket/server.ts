import { createServer } from 'node:http';
import type { Express } from 'express';
import { Server } from 'socket.io';
import { randomInt } from 'node:crypto';
import { sanitizeStateForViewer } from '@duopoker/game-engine/index';
import type { SessionState } from '@duopoker/shared-types/index';
import { config } from '../config.js';
import { redis } from '../services/redis.js';
import {
  getSubscriptionTiersBatch,
  getUserSubscriptionTier
} from '../services/subscription-tier.js';
import { assertCanJoinSession, newSessionId } from '../services/session-access.js';
import {
  autoStartNextHand,
  advanceBotTurns,
  enqueueMatchmaking,
  enforceActionTimeout,
  foldActivePlayerOnTimeout,
  getSessionSnapshot,
  joinTable,
  leaveTable,
  requestNextHand,
  seatPlayersBatch,
} from '../services/game-session.js';
import {
  ACTION_TIMEOUT_MS,
  NEXT_HAND_DELAY_MS,
  BOT_THINK_MIN_MS,
  BOT_THINK_MAX_MS,
  BOT_THINK_RAISE_MIN_MS,
  BOT_THINK_RAISE_MAX_MS,
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
import { joinSchema, matchmakingSchema, tableChatSendSchema } from './schemas.js';
import { registerReconnectHandler } from './handlers/reconnect.js';
import { registerPlayerActionHandler } from './handlers/playerAction.js';
import { registerVoiceSignalHandler } from './handlers/voice.js';
import { actionSchema } from './schemas.js';

const BOT_PREFIX = 'duopoker-bot';

/** userId -> socket ids (tabs / reconnects) */
const userToSockets = new Map<string, Set<string>>();
const actionTimers = new Map<string, ReturnType<typeof setTimeout>>();
const nextHandTimers = new Map<string, ReturnType<typeof setTimeout>>();
const botTickTimers = new Map<string, ReturnType<typeof setTimeout>>();

const isBotTurnStreet = (street: SessionState['street'] | undefined): boolean =>
  Boolean(street && street !== 'LOBBY' && street !== 'COMPLETE' && street !== 'SHOWDOWN');

const botThinkDelayMs = (state: SessionState): number => {
  const log = state.actionLog ?? [];
  const last = log[log.length - 1];
  const isHeavy = last?.type === 'raise' || last?.type === 'bet' || last?.type === 'bid';
  const potHeavy =
    state.pot +
      state.players.reduce((sum, p) => sum + (state.playerRoundBet[p] ?? 0), 0) >
    (state.bigBlind ?? 2) * 12;
  if (isHeavy || potHeavy) {
    return BOT_THINK_RAISE_MIN_MS + randomInt(0, BOT_THINK_RAISE_MAX_MS - BOT_THINK_RAISE_MIN_MS);
  }
  return BOT_THINK_MIN_MS + randomInt(0, BOT_THINK_MAX_MS - BOT_THINK_MIN_MS);
};

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
};

const runBotStep = async (io: Server, sessionId: string): Promise<SessionState | null> => {
  let out = await advanceBotTurns(sessionId);
  if (!out) out = await getSessionSnapshot(sessionId);
  if (!out) return null;

  const nextHand = await autoStartNextHand(sessionId);
  if (nextHand && nextHand.street !== 'COMPLETE') out = nextHand;

  await emitStateToSession(io, sessionId, out);
  scheduleActionTimer(io, sessionId, out);
  scheduleNextHandTimer(io, sessionId, out);
  return out;
};

const scheduleBotTurn = (io: Server, sessionId: string, state: SessionState) => {
  clearBotTickTimer(sessionId);
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId?.startsWith(BOT_PREFIX)) return;
  if (!isBotTurnStreet(state.street)) return;

  const delay = botThinkDelayMs(state);
  botTickTimers.set(
    sessionId,
    setTimeout(() => {
      void (async () => {
        const next = await runBotStep(io, sessionId);
        if (!next) {
          clearBotTickTimer(sessionId);
          return;
        }
        scheduleBotTurn(io, sessionId, next);
      })();
    }, delay)
  );
};

const emitStateToSession = async (io: Server, sessionId: string, state: SessionState) => {
  const sockets = await io.in(sessionId).fetchSockets();
  const viewerIds = sockets
    .map((s) => (typeof s.data.userId === 'string' ? s.data.userId : undefined))
    .filter((id): id is string => Boolean(id));
  const tiers = await getSubscriptionTiersBatch(viewerIds);
  for (const s of sockets) {
    const viewerId = typeof s.data.userId === 'string' ? s.data.userId : undefined;
    const subscriptionTier = viewerId ? (tiers.get(viewerId) ?? 'FREE') : 'FREE';
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
  const timedOut = await enforceActionTimeout(sessionId);
  if (timedOut) out = timedOut;
  const nextHand = await autoStartNextHand(sessionId);
  if (nextHand && nextHand.street !== 'COMPLETE') out = nextHand;
  await emitStateToSession(io, sessionId, out);
  scheduleActionTimer(io, sessionId, out);
  scheduleNextHandTimer(io, sessionId, out);
  scheduleBotTurn(io, sessionId, out);
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

export const emitNotificationToUsers = (userIds: string[], event: string, payload: unknown) => {
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
      origin: config.corsOrigin,
      credentials: true
    }
  });
  globalIo = io;
  attachSocketAuth(io);

  const connectionsPerIp = new Map<string, number>();
  const MAX_CONNECTIONS_PER_IP = 25;
  const joinBurst = new Map<string, number[]>();
  const MAX_JOINS_PER_MINUTE = 30;

  const pruneJoinBurst = (now = Date.now()) => {
    for (const [key, hits] of joinBurst) {
      const fresh = hits.filter((t) => now - t < 60_000);
      if (fresh.length === 0) joinBurst.delete(key);
      else joinBurst.set(key, fresh);
    }
  };

  setInterval(() => pruneJoinBurst(), 60_000).unref?.();

  io.on('connection', (socket) => {
    const ip = socket.handshake.address;
    const current = connectionsPerIp.get(ip) ?? 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
      socket.emit('sessionError', { code: 'LOAD_SHED' });
      socket.disconnect(true);
      return;
    }
    connectionsPerIp.set(ip, current + 1);

    if (socket.data.userId) {
      registerUserSocket(socket.data.userId, socket.id);
    }

    socket.on('disconnect', () => {
      const n = connectionsPerIp.get(ip) ?? 1;
      if (n <= 1) connectionsPerIp.delete(ip);
      else connectionsPerIp.set(ip, n - 1);
      unregisterSocketEverywhere(socket.id);
    });

    const assertSocketInSession = async (sessionId: string) => {
      const sockets = await io.in(sessionId).fetchSockets();
      return sockets.some((s) => s.id === socket.id);
    };

    registerReconnectHandler(io, socket, registerUserSocket, broadcastSessionState);

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
      socket.data.userId = userId;

      const burstKey = `${ip}:${userId}`;
      const now = Date.now();
      const hits = (joinBurst.get(burstKey) ?? []).filter((t) => now - t < 60_000);
      if (hits.length >= MAX_JOINS_PER_MINUTE) {
        socket.emit('sessionError', { code: 'JOIN_RATE_LIMIT' });
        return;
      }
      hits.push(now);
      joinBurst.set(burstKey, hits);

      const access = await assertCanJoinSession(sessionId, userId);
      if (!access.ok) {
        socket.emit('sessionError', { code: access.reason });
        return;
      }

      registerUserSocket(userId, socket.id);
      await socket.join(sessionId);
      const state = await joinTable(sessionId, userId, mode, buyIn);
      await redis.publish(`lobby:${sessionId}`, JSON.stringify({ type: 'join', userId }));
      const subscriptionTier = await getUserSubscriptionTier(userId);
      socket.emit('sessionEvent', {
        type: 'PLAYER_JOINED',
        userId,
        state: sanitizeStateForViewer(state, userId, { subscriptionTier })
      });
      await broadcastSessionState(io, sessionId, state);
    });

    registerPlayerActionHandler(io, socket, actionSchema, clearActionTimer, broadcastSessionState);

    socket.on(
      'readyNextHand',
      async ({ sessionId, userId: payloadUserId }: { sessionId?: string; userId?: string }) => {
        if (!sessionId || typeof sessionId !== 'string') return;
        const userId = resolveUserId(socket, payloadUserId);
        if (!userId) {
          socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
          return;
        }
        const result = await requestNextHand(sessionId, userId);
        if (!result.ok) {
          socket.emit('sessionError', { code: result.reason });
          return;
        }
        if (result.state.street !== 'COMPLETE') {
          clearNextHandTimer(sessionId);
        }
        await broadcastSessionState(io, sessionId, result.state);
      }
    );

    socket.on(
      'leaveTable',
      async ({ sessionId, userId: payloadUserId }: { sessionId?: string; userId?: string }) => {
        if (!sessionId || typeof sessionId !== 'string') return;
        const userId = resolveUserId(socket, payloadUserId);
        if (!userId) {
          socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
          return;
        }
        clearActionTimer(sessionId);
        clearBotTickTimer(sessionId);
        clearNextHandTimer(sessionId);
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
      }
    );

    registerVoiceSignalHandler(socket, assertSocketInSession);

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
      await seatPlayersBatch(
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
