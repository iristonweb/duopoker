import {
  addPlayerToTable,
  applyTableAction,
  buildAutoNextHand,
  createInitialTableState,
  createReplayTimeline,
  enrichSessionMeta,
  markReadyForNextHand,
  normalizeSessionState,
  removePlayerFromTable,
  shouldAutoStartNextHand,
  shouldForceActionTimeout,
  startNewHand,
  foldActivePlayerRuntime,
  advanceBotTurnsRuntime,
  tickSessionRuntime
} from '@duopoker/game-engine/index';
import { randomSessionSeed } from '@duopoker/game-engine/server-rng';
import { canAcceptPlayerAction, pruneActionRateLimitBuckets } from '@duopoker/session-core';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import {
  clampMatchPlayerCount,
  matchmakingPlayerTarget,
  minPlayersToStart
} from '@duopoker/shared-types/index';
import {
  loadGameSnapshotWithVersion,
  persistGameSnapshot
} from './session-persistence.js';

const BOT_PREFIX = 'duopoker-bot';
const SESSION_IDLE_TTL_MS = 30 * 60 * 1000;

const sessions = new Map<string, SessionState>();
const sessionVersions = new Map<string, number>();
const sessionLastAccess = new Map<string, number>();
const queue: import('@duopoker/shared-types/index').MatchmakingTicket[] = [];

const touchSession = (sessionId: string) => {
  sessionLastAccess.set(sessionId, Date.now());
};

const save = async (state: SessionState) => {
  const enriched = enrichSessionMeta(state);
  sessions.set(enriched.sessionId, enriched);
  touchSession(enriched.sessionId);
  const expectedVersion = sessionVersions.get(enriched.sessionId) ?? null;
  try {
    const result = await persistGameSnapshot(enriched, expectedVersion);
    if (result.ok) {
      sessionVersions.set(enriched.sessionId, result.version);
    } else {
      const fresh = await loadGameSnapshotWithVersion(enriched.sessionId);
      if (fresh) {
        sessionVersions.set(enriched.sessionId, fresh.version);
      }
    }
  } catch (err) {
    console.error('[game-session] persist failed', enriched.sessionId, err);
  }
  return enriched;
};

export const evictIdleSessions = (now = Date.now()): void => {
  pruneActionRateLimitBuckets(now);
  for (const [sessionId, lastAccess] of sessionLastAccess) {
    if (now - lastAccess < SESSION_IDLE_TTL_MS) continue;
    sessions.delete(sessionId);
    sessionVersions.delete(sessionId);
    sessionLastAccess.delete(sessionId);
  }
};

setInterval(() => evictIdleSessions(), 5 * 60 * 1000).unref?.();

export const ensureSessionState = (
  sessionId: string,
  mode: SessionState['mode'],
  buyIn = 100,
  seed?: number,
  jokerRules?: SessionState['jokerRules']
) => {
  if (!sessions.has(sessionId)) {
    sessions.set(
      sessionId,
      createInitialTableState(sessionId, mode, buyIn, seed ?? randomSessionSeed(), jokerRules)
    );
  }
  return sessions.get(sessionId)!;
};

/** Seat all players then start one hand. */
export const seatPlayersBatch = async (
  sessionId: string,
  userIds: string[],
  mode: SessionState['mode'],
  buyIn: number,
  jokerRules?: SessionState['jokerRules']
) => {
  let state = ensureSessionState(sessionId, mode, buyIn, undefined, jokerRules);
  for (const userId of userIds) {
    state = addPlayerToTable(state, userId);
  }
  if (state.players.length >= minPlayersToStart(mode) && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  sessions.set(sessionId, state);
  return save(state);
};

/** Add player; auto-start hand when table is full enough for the mode. */
export const joinTable = async (
  sessionId: string,
  userId: string,
  mode: SessionState['mode'],
  buyIn: number
) => {
  let state = ensureSessionState(sessionId, mode, buyIn);
  state = addPlayerToTable(state, userId);
  if (state.players.length >= minPlayersToStart(mode) && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  return save(state);
};

export const processPlayerAction = async (action: PlayerAction) => {
  if (!canAcceptPlayerAction(action.userId)) {
    return { rejected: true as const, reason: 'RATE_LIMITED' };
  }

  let existing = sessions.get(action.sessionId);
  if (!existing) {
    const fromDb = await loadGameSnapshotWithVersion(action.sessionId);
    if (fromDb) {
      existing = normalizeSessionState(fromDb.state);
      sessions.set(action.sessionId, existing);
      sessionVersions.set(action.sessionId, fromDb.version);
      touchSession(action.sessionId);
    }
  }
  if (!existing) {
    return { rejected: true as const, reason: 'SESSION_NOT_FOUND' };
  }

  const result = applyTableAction(existing, action);
  if (!result.ok) {
    return { rejected: true as const, reason: result.reason };
  }

  const saved = await save(result.state);
  return { rejected: false as const, state: saved, replay: createReplayTimeline(saved) };
};

export const requestNextHand = async (sessionId: string, userId: string) => {
  const state = sessions.get(sessionId);
  if (!state) {
    return { ok: false as const, reason: 'SESSION_NOT_FOUND' };
  }
  const result = markReadyForNextHand(state, userId);
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }
  sessions.set(sessionId, result.state);
  await save(result.state);
  return { ok: true as const, state: result.state, started: result.started };
};

export const enqueueMatchmaking = (
  ticket: import('@duopoker/shared-types/index').MatchmakingTicket,
  opts?: { allowSoloQueue?: boolean; opponent?: 'human' | 'bot'; playerCount?: number }
) => {
  type Ticket = import('@duopoker/shared-types/index').MatchmakingTicket;
  if (opts?.opponent === 'bot') {
    const idx = queue.findIndex((q) => q.userId === ticket.userId);
    if (idx >= 0) queue.splice(idx, 1);
    const count = clampMatchPlayerCount(ticket.mode, opts.playerCount);
    const base = Date.now();
    const bots: Ticket[] = Array.from({ length: count - 1 }, (_, i) => ({
      userId: `${BOT_PREFIX}-${base}-${i}`,
      mode: ticket.mode,
      buyIn: ticket.buyIn,
      createdAt: Date.now()
    }));
    return [ticket, ...bots];
  }

  const allowSolo = opts?.opponent === 'human' ? false : opts?.allowSoloQueue === true;
  queue.push(ticket);
  const compatible = queue.filter((q) => q.mode === ticket.mode && q.buyIn === ticket.buyIn).slice(0, 6);
  const target = matchmakingPlayerTarget(ticket.mode);
  if (compatible.length >= target) {
    const picked = compatible.slice(0, target);
    picked.forEach((item) => {
      const idx = queue.findIndex((q) => q.userId === item.userId && q.createdAt === item.createdAt);
      if (idx >= 0) queue.splice(idx, 1);
    });
    return picked;
  }
  if (allowSolo && compatible.length === 1) {
    const human = compatible[0]!;
    const idx = queue.findIndex((q) => q.userId === human.userId && q.createdAt === human.createdAt);
    if (idx >= 0) queue.splice(idx, 1);
    const botCount = matchmakingPlayerTarget(human.mode) - 1;
    const base = Date.now();
    const bots: Ticket[] = Array.from({ length: botCount }, (_, i) => ({
      userId: `${BOT_PREFIX}-${base}-${i}`,
      mode: human.mode,
      buyIn: human.buyIn,
      createdAt: Date.now()
    }));
    return [human, ...bots];
  }
  return null;
};

/** Advances through consecutive bot turns until a human acts or the hand ends. */
export const advanceBotTurns = async (sessionId: string): Promise<SessionState | null> =>
  advanceBotTurnsRuntime(
    () => getSessionSnapshot(sessionId),
    (action) => processPlayerAction(action)
  );

export const autoStartNextHand = async (sessionId: string): Promise<SessionState | null> => {
  const state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
  if (!state || !shouldAutoStartNextHand(state)) return state;
  const next = await save(buildAutoNextHand(state));
  const botState = await advanceBotTurns(sessionId);
  return botState ?? next;
};

export const enforceActionTimeout = async (sessionId: string): Promise<SessionState | null> => {
  const state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
  if (!state || !shouldForceActionTimeout(state)) return null;
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId) return null;
  return foldActivePlayerOnTimeout(sessionId, activeId);
};

export const tickSession = async (sessionId: string): Promise<SessionState | null> =>
  tickSessionRuntime(() => getSessionSnapshot(sessionId), {
    enforceActionTimeout: () => enforceActionTimeout(sessionId),
    advanceBotTurns: () => advanceBotTurns(sessionId),
    autoStartNextHand: () => autoStartNextHand(sessionId)
  });

export const getSessionSnapshot = async (sessionId: string): Promise<SessionState | null> => {
  const mem = sessions.get(sessionId);
  if (mem) {
    touchSession(sessionId);
    return mem;
  }
  const db = await loadGameSnapshotWithVersion(sessionId);
  if (db) {
    const normalized = normalizeSessionState(db.state);
    sessions.set(sessionId, normalized);
    sessionVersions.set(sessionId, db.version);
    touchSession(sessionId);
    return normalized;
  }
  return null;
};

/** Fold the active player when their action timer expires. */
export const foldActivePlayerOnTimeout = async (
  sessionId: string,
  userId: string
): Promise<SessionState | null> =>
  foldActivePlayerRuntime(
    () => getSessionSnapshot(sessionId),
    (state) => save(state),
    sessionId,
    userId,
    () => advanceBotTurns(sessionId),
    () => autoStartNextHand(sessionId)
  );

export const leaveTable = async (sessionId: string, userId: string) => {
  const state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
  if (!state) {
    return { ok: false as const, reason: 'SESSION_NOT_FOUND' };
  }
  if (!state.players.includes(userId)) {
    return { ok: false as const, reason: 'NOT_SEATED' };
  }
  const result = removePlayerFromTable(state, userId);
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }
  const saved = await save(result.state);
  const botState = await advanceBotTurns(sessionId);
  const after = botState ?? saved;
  return { ok: true as const, state: after };
};

export const listSessionIdsForUser = (userId: string): string[] => {
  const ids: string[] = [];
  for (const [sessionId, state] of sessions) {
    if (state.players.includes(userId)) ids.push(sessionId);
  }
  return ids;
};
