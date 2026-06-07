import {
  addPlayerToTable,
  applyTableAction,
  autoFoldActivePlayer,
  buildAutoNextHand,
  createInitialTableState,
  createReplayTimeline,
  enrichSessionMeta,
  isAutomatedPlayer,
  markReadyForNextHand,
  normalizeSessionState,
  pickBotAction,
  pickBotJokerAction,
  jokerTimeoutAction,
  removePlayerFromTable,
  shouldAutoStartNextHand,
  shouldForceActionTimeout,
  startNewHand
} from '@duopoker/game-engine/index';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import {
  clampMatchPlayerCount,
  matchmakingPlayerTarget,
  minPlayersToStart
} from '@duopoker/shared-types/index';
import { loadGameSnapshot, persistGameSnapshot } from './session-persistence.js';

const BOT_PREFIX = 'duopoker-bot';

const sessions = new Map<string, SessionState>();
const actionCounters = new Map<string, { second: number; count: number }>();
const queue: import('@duopoker/shared-types/index').MatchmakingTicket[] = [];

const RATE_LIMIT_PER_SECOND = 20;

const save = (state: SessionState) => {
  const enriched = enrichSessionMeta(state);
  sessions.set(enriched.sessionId, enriched);
  void persistGameSnapshot(enriched).catch((err) => {
    console.error('[game-session] persist failed', enriched.sessionId, err);
  });
  return enriched;
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
  seed?: number,
  jokerRules?: SessionState['jokerRules']
) => {
  if (!sessions.has(sessionId)) {
    sessions.set(
      sessionId,
      createInitialTableState(sessionId, mode, buyIn, seed ?? Date.now(), jokerRules)
    );
  }
  return sessions.get(sessionId)!;
};

/** Seat all players then start one hand. */
export const seatPlayersBatch = (
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
export const joinTable = (sessionId: string, userId: string, mode: SessionState['mode'], buyIn: number) => {
  let state = ensureSessionState(sessionId, mode, buyIn);
  state = addPlayerToTable(state, userId);
  if (state.players.length >= minPlayersToStart(mode) && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  return save(state);
};

export const processPlayerAction = async (action: PlayerAction) => {
  if (!canAcceptAction(action.userId)) {
    return { rejected: true as const, reason: 'RATE_LIMITED' };
  }

  let existing = sessions.get(action.sessionId);
  if (!existing) {
    const fromDb = await loadGameSnapshot(action.sessionId);
    if (fromDb) {
      existing = normalizeSessionState(fromDb);
      sessions.set(action.sessionId, existing);
    }
  }
  if (!existing) {
    return { rejected: true as const, reason: 'SESSION_NOT_FOUND' };
  }

  const result = applyTableAction(existing, action);
  if (!result.ok) {
    return { rejected: true as const, reason: result.reason };
  }

  const saved = save(result.state);
  return { rejected: false as const, state: saved, replay: createReplayTimeline(saved) };
};

export const requestNextHand = (sessionId: string, userId: string) => {
  const state = sessions.get(sessionId);
  if (!state) {
    return { ok: false as const, reason: 'SESSION_NOT_FOUND' };
  }
  const result = markReadyForNextHand(state, userId);
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }
  sessions.set(sessionId, result.state);
  save(result.state);
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
export const advanceBotTurns = async (sessionId: string): Promise<SessionState | null> => {
  let last: SessionState | null = null;
  for (let i = 0; i < 96; i += 1) {
    const state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
    if (!state) break;
    const activeId = state.players[state.activePlayerIndex];
    if (!activeId || !isAutomatedPlayer(activeId)) break;
    if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') break;

    const primary =
      state.mode === 'JOKER' ? pickBotJokerAction(state, activeId) : pickBotAction(state, activeId);
    let r = await processPlayerAction(primary);
    if (r.rejected && state.mode === 'JOKER') {
      r = await processPlayerAction(jokerTimeoutAction(state, activeId));
    }
    if (r.rejected) {
      r = await processPlayerAction({ ...primary, type: 'call', at: Date.now() });
    }
    if (r.rejected) {
      r = await processPlayerAction({ ...primary, type: 'fold', at: Date.now() });
    }
    if (r.rejected) break;
    last = r.state;
  }
  return last;
};

export const autoStartNextHand = async (sessionId: string): Promise<SessionState | null> => {
  const state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
  if (!state || !shouldAutoStartNextHand(state)) return state;
  const next = save(buildAutoNextHand(state));
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

export const tickSession = async (sessionId: string): Promise<SessionState | null> => {
  let state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
  if (!state) return null;

  const timedOut = await enforceActionTimeout(sessionId);
  if (timedOut) state = timedOut;

  let botState = await advanceBotTurns(sessionId);
  if (botState) state = botState;

  const nextHand = await autoStartNextHand(sessionId);
  if (nextHand && nextHand.street !== 'COMPLETE') state = nextHand;

  botState = await advanceBotTurns(sessionId);
  if (botState) state = botState;

  return state;
};

export const getSessionSnapshot = async (sessionId: string): Promise<SessionState | null> => {
  const mem = sessions.get(sessionId);
  if (mem) return mem;
  const db = await loadGameSnapshot(sessionId);
  if (db) {
    const normalized = normalizeSessionState(db);
    sessions.set(sessionId, normalized);
    return normalized;
  }
  return null;
};

/** Fold the active player when their action timer expires. */
export const foldActivePlayerOnTimeout = async (
  sessionId: string,
  userId: string
): Promise<SessionState | null> => {
  const state = sessions.get(sessionId) ?? (await getSessionSnapshot(sessionId));
  if (!state) return null;
  const activeId = state.players[state.activePlayerIndex];
  if (activeId !== userId) return null;
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return null;
  }
  const result = autoFoldActivePlayer(state, userId);
  if (!result.ok) return null;
  save(result.state);
  const botState = await advanceBotTurns(sessionId);
  const after = botState ?? save(result.state);
  return (await autoStartNextHand(sessionId)) ?? after;
};

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
  const saved = save(result.state);
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
