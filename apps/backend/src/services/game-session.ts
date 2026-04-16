import {
  addPlayerToTable,
  applyTableAction,
  createInitialTableState,
  createReplayTimeline,
  startNewHand
} from '@duopoker/game-engine/index';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { loadGameSnapshot, persistGameSnapshot } from './session-persistence.js';

const BOT_PREFIX = 'duopoker-bot';

const sessions = new Map<string, SessionState>();
const actionCounters = new Map<string, { second: number; count: number }>();
const queue: import('@duopoker/shared-types/index').MatchmakingTicket[] = [];

const RATE_LIMIT_PER_SECOND = 20;

const save = (state: SessionState) => {
  void persistGameSnapshot(state).catch(() => undefined);
};

const canAcceptAction = (userId: string): boolean => {
  const currentSecond = Math.floor(Date.now() / 1000);
  const bucket = actionCounters.get(userId);
  if (!bucket || bucket.second !== currentSecond) {
    actionCounters.set(userId, { second: currentSecond, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_SECOND) return false;
  bucket.count += 1;
  return true;
};

export const ensureSessionState = (
  sessionId: string,
  mode: SessionState['mode'],
  buyIn = 100,
  seed?: number
) => {
  if (!sessions.has(sessionId)) {
    sessions.set(
      sessionId,
      createInitialTableState(sessionId, mode, buyIn, seed ?? Date.now())
    );
  }
  return sessions.get(sessionId)!;
};

/** Add player; auto-start hand when 2+ seated in LOBBY. */
export const joinTable = (sessionId: string, userId: string, mode: SessionState['mode'], buyIn: number) => {
  let state = ensureSessionState(sessionId, mode, buyIn);
  state = addPlayerToTable(state, userId);
  if (state.players.length >= 2 && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  sessions.set(sessionId, state);
  save(state);
  return state;
};

export const processPlayerAction = async (action: PlayerAction) => {
  if (!canAcceptAction(action.userId)) {
    return { rejected: true as const, reason: 'RATE_LIMITED' };
  }

  let existing = sessions.get(action.sessionId);
  if (!existing) {
    const fromDb = await loadGameSnapshot(action.sessionId);
    if (fromDb) {
      sessions.set(action.sessionId, fromDb);
      existing = fromDb;
    }
  }
  if (!existing) {
    return { rejected: true as const, reason: 'SESSION_NOT_FOUND' };
  }

  const result = applyTableAction(existing, action);
  if (!result.ok) {
    return { rejected: true as const, reason: result.reason };
  }

  sessions.set(action.sessionId, result.state);
  save(result.state);
  return { rejected: false as const, state: result.state, replay: createReplayTimeline(result.state) };
};

export const requestNextHand = (sessionId: string) => {
  const state = sessions.get(sessionId);
  if (!state || state.street !== 'COMPLETE' || state.players.length < 2) {
    return { ok: false as const, reason: 'CANNOT_START' };
  }
  const next = startNewHand(state);
  sessions.set(sessionId, next);
  save(next);
  return { ok: true as const, state: next };
};

export const enqueueMatchmaking = (
  ticket: import('@duopoker/shared-types/index').MatchmakingTicket,
  opts?: { allowSoloQueue?: boolean }
) => {
  type Ticket = import('@duopoker/shared-types/index').MatchmakingTicket;
  const allowSolo = opts?.allowSoloQueue === true;
  queue.push(ticket);
  const compatible = queue.filter((q) => q.mode === ticket.mode && q.buyIn === ticket.buyIn).slice(0, 6);
  if (compatible.length >= 2) {
    compatible.forEach((item) => {
      const idx = queue.findIndex((q) => q.userId === item.userId && q.createdAt === item.createdAt);
      if (idx >= 0) queue.splice(idx, 1);
    });
    return compatible;
  }
  if (allowSolo && compatible.length === 1) {
    const human = compatible[0]!;
    const idx = queue.findIndex((q) => q.userId === human.userId && q.createdAt === human.createdAt);
    if (idx >= 0) queue.splice(idx, 1);
    const bot: Ticket = {
      userId: `${BOT_PREFIX}-${Date.now()}`,
      mode: human.mode,
      buyIn: human.buyIn,
      createdAt: Date.now()
    };
    return [human, bot];
  }
  return null;
};

/** Advances through consecutive bot turns (check → call → fold). Returns last state if any bot action ran. */
export const advanceBotTurns = async (sessionId: string): Promise<SessionState | null> => {
  let last: SessionState | null = null;
  for (let i = 0; i < 48; i += 1) {
    const state = sessions.get(sessionId);
    if (!state) break;
    const activeId = state.players[state.activePlayerIndex];
    if (!activeId || !activeId.startsWith(BOT_PREFIX)) break;
    if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') break;

    const at = Date.now();
    let r = await processPlayerAction({ sessionId, userId: activeId, type: 'check', at });
    if (r.rejected) r = await processPlayerAction({ sessionId, userId: activeId, type: 'call', at });
    if (r.rejected) r = await processPlayerAction({ sessionId, userId: activeId, type: 'fold', at });
    if (r.rejected) break;
    last = r.state;
  }
  return last;
};

export const getSessionSnapshot = async (sessionId: string): Promise<SessionState | null> => {
  const mem = sessions.get(sessionId);
  if (mem) return mem;
  const db = await loadGameSnapshot(sessionId);
  if (db) {
    sessions.set(sessionId, db);
    return db;
  }
  return null;
};
