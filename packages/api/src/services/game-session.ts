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
  removePlayerFromTable,
  shouldAutoStartNextHand,
  shouldForceActionTimeout,
  startNewHand
} from '@duopoker/game-engine/index';
import type { MatchmakingTicket, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { config } from '../config.js';
import { newSessionId } from './session-access.js';
import { loadGameSnapshot, persistGameSnapshot } from './session-persistence.js';
import { prisma } from '../lib/prisma.js';

export const BOT_PREFIX = 'duopoker-bot';

const saveState = async (state: SessionState): Promise<SessionState> => {
  const enriched = enrichSessionMeta(state);
  await persistGameSnapshot(enriched);
  return enriched;
};

export const getSessionSnapshot = async (sessionId: string): Promise<SessionState | null> => {
  const db = await loadGameSnapshot(sessionId);
  return db ? normalizeSessionState(db) : null;
};

const ensureSessionState = async (
  sessionId: string,
  mode: SessionState['mode'],
  buyIn = 100,
  seed?: number
): Promise<SessionState> => {
  const existing = await getSessionSnapshot(sessionId);
  if (existing) return existing;
  return createInitialTableState(sessionId, mode, buyIn, seed ?? Date.now());
};

/** Add player; auto-start hand when 2+ seated in LOBBY. */
const seatPlayer = async (
  sessionId: string,
  userId: string,
  mode: SessionState['mode'],
  buyIn: number,
  clearAssignment: boolean
) => {
  let state = await ensureSessionState(sessionId, mode, buyIn);
  state = addPlayerToTable(state, userId);
  if (state.players.length >= 2 && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  await saveState(state);
  if (clearAssignment) {
    await clearMatchAssignment(userId);
  }
  return state;
};

export const joinTable = async (
  sessionId: string,
  userId: string,
  mode: SessionState['mode'],
  buyIn: number
) => seatPlayer(sessionId, userId, mode, buyIn, true);

export const processPlayerAction = async (action: PlayerAction) => {
  const existing = await getSessionSnapshot(action.sessionId);
  if (!existing) {
    return { rejected: true as const, reason: 'SESSION_NOT_FOUND' };
  }

  const result = applyTableAction(existing, action);
  if (!result.ok) {
    return { rejected: true as const, reason: result.reason };
  }

  const saved = await saveState(result.state);
  return {
    rejected: false as const,
    state: saved,
    replay: createReplayTimeline(saved)
  };
};

export const requestNextHand = async (sessionId: string, userId: string) => {
  const state = await getSessionSnapshot(sessionId);
  if (!state) {
    return { ok: false as const, reason: 'SESSION_NOT_FOUND' };
  }
  const result = markReadyForNextHand(state, userId);
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }
  await saveState(result.state);
  return { ok: true as const, state: result.state, started: result.started };
};

export type MatchmakingOpts = {
  allowSoloQueue?: boolean;
  opponent?: 'human' | 'bot';
  playerCount?: number;
};

const clampPlayerCount = (n?: number) => Math.min(6, Math.max(2, n ?? 2));

const spawnBotTickets = (
  human: MatchmakingTicket,
  count: number
): MatchmakingTicket[] => {
  const base = Date.now();
  const bots = Array.from({ length: count - 1 }, (_, i) => ({
    userId: `${BOT_PREFIX}-${base}-${i}`,
    mode: human.mode,
    buyIn: human.buyIn,
    createdAt: Date.now()
  }));
  return [human, ...bots];
};

/** Seat all players then start one hand (avoids partial multi-bot seating). */
const seatPlayersBatch = async (
  sessionId: string,
  userIds: string[],
  mode: SessionState['mode'],
  buyIn: number
) => {
  let state = await ensureSessionState(sessionId, mode, buyIn);
  for (const userId of userIds) {
    state = addPlayerToTable(state, userId);
  }
  if (state.players.length >= 2 && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  await saveState(state);
  return state;
};

export const enqueueMatchmaking = async (
  ticket: MatchmakingTicket,
  opts?: MatchmakingOpts
): Promise<MatchmakingTicket[] | null> => {
  if (opts?.opponent === 'bot') {
    await prisma.matchmakingTicket.deleteMany({ where: { userId: ticket.userId } });
    return spawnBotTickets(ticket, clampPlayerCount(opts.playerCount));
  }

  const allowSolo = opts?.opponent === 'human' ? false : opts?.allowSoloQueue === true;

  await prisma.matchmakingTicket.upsert({
    where: { userId: ticket.userId },
    create: {
      userId: ticket.userId,
      mode: ticket.mode,
      buyIn: ticket.buyIn
    },
    update: {
      mode: ticket.mode,
      buyIn: ticket.buyIn,
      createdAt: new Date()
    }
  });

  const compatible = await prisma.matchmakingTicket.findMany({
    where: { mode: ticket.mode, buyIn: ticket.buyIn },
    orderBy: { createdAt: 'asc' },
    take: 6
  });

  if (compatible.length >= 2) {
    const picked = compatible.slice(0, 2);
    await prisma.matchmakingTicket.deleteMany({
      where: { userId: { in: picked.map((p) => p.userId) } }
    });
    return picked.map((p) => ({
      userId: p.userId,
      mode: p.mode,
      buyIn: p.buyIn,
      createdAt: p.createdAt.getTime()
    }));
  }

  if (allowSolo && compatible.length === 1) {
    const human = compatible[0]!;
    await prisma.matchmakingTicket.deleteMany({ where: { userId: human.userId } });
    const bot: MatchmakingTicket = {
      userId: `${BOT_PREFIX}-${Date.now()}`,
      mode: human.mode,
      buyIn: human.buyIn,
      createdAt: Date.now()
    };
    return [
      {
        userId: human.userId,
        mode: human.mode,
        buyIn: human.buyIn,
        createdAt: human.createdAt.getTime()
      },
      bot
    ];
  }

  return null;
};

export const autoStartNextHand = async (sessionId: string): Promise<SessionState | null> => {
  const state = await getSessionSnapshot(sessionId);
  if (!state || !shouldAutoStartNextHand(state)) return state;
  const next = await saveState(buildAutoNextHand(state));
  const botState = await advanceBotTurns(sessionId);
  return botState ?? next;
};

export const enforceActionTimeout = async (sessionId: string): Promise<SessionState | null> => {
  const state = await getSessionSnapshot(sessionId);
  if (!state || !shouldForceActionTimeout(state)) return null;
  const activeId = state.players[state.activePlayerIndex];
  if (!activeId) return null;
  return foldActivePlayerOnTimeout(sessionId, activeId);
};

/** Timeouts, bot turns, and auto next-hand — call after every mutation or poll. */
export const tickSession = async (sessionId: string): Promise<SessionState | null> => {
  let state = await getSessionSnapshot(sessionId);
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

/** Advances through consecutive bot turns until a human acts or the hand ends. */
export const advanceBotTurns = async (sessionId: string): Promise<SessionState | null> => {
  let last: SessionState | null = null;
  for (let i = 0; i < 96; i += 1) {
    const state = await getSessionSnapshot(sessionId);
    if (!state) break;
    const activeId = state.players[state.activePlayerIndex];
    if (!activeId || !isAutomatedPlayer(activeId)) break;
    if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') break;

    const primary = pickBotAction(state, activeId);
    let r = await processPlayerAction(primary);
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

export const foldActivePlayerOnTimeout = async (
  sessionId: string,
  userId: string
): Promise<SessionState | null> => {
  const state = await getSessionSnapshot(sessionId);
  if (!state) return null;
  const activeId = state.players[state.activePlayerIndex];
  if (activeId !== userId) return null;
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return null;
  }
  const result = autoFoldActivePlayer(state, userId);
  if (!result.ok) return null;
  await saveState(result.state);
  const botState = await advanceBotTurns(sessionId);
  const next = botState ?? (await saveState(result.state));
  return (await autoStartNextHand(sessionId)) ?? next;
};

export const createVipSession = async (
  userIds: string[],
  mode: SessionState['mode'],
  buyIn: number
) => {
  const sessionId = newSessionId('vip');
  await seatPlayersBatch(sessionId, userIds, mode, buyIn);
  await tickSession(sessionId);
  return sessionId;
};

export const createMatchFromQueue = async (
  ready: MatchmakingTicket[],
  mode: SessionState['mode'],
  buyIn: number
) => {
  const sessionId = newSessionId();
  await seatPlayersBatch(
    sessionId,
    ready.map((r) => r.userId),
    mode,
    buyIn
  );
  await tickSession(sessionId);

  return {
    sessionId,
    players: ready.map((r) => r.userId),
    mode,
    buyIn
  };
};

export const matchmakingAllowsSolo = () => config.allowSoloQueue;

export type QueueStatus =
  | { status: 'idle' }
  | { status: 'waiting'; mode: SessionState['mode']; buyIn: number }
  | {
      status: 'matched';
      sessionId: string;
      mode: SessionState['mode'];
      buyIn: number;
      players: string[];
    };

export const getQueueStatus = async (userId: string): Promise<QueueStatus> => {
  const assignment = await prisma.matchAssignment.findUnique({ where: { userId } });
  if (assignment) {
    const snapshot = await getSessionSnapshot(assignment.sessionId);
    return {
      status: 'matched',
      sessionId: assignment.sessionId,
      mode: assignment.mode,
      buyIn: assignment.buyIn,
      players: snapshot?.players ?? [userId]
    };
  }

  const ticket = await prisma.matchmakingTicket.findUnique({ where: { userId } });
  if (ticket) {
    return { status: 'waiting', mode: ticket.mode, buyIn: ticket.buyIn };
  }

  return { status: 'idle' };
};

export const leaveQueue = async (userId: string) => {
  await prisma.matchmakingTicket.deleteMany({ where: { userId } });
};

export const leaveTable = async (sessionId: string, userId: string) => {
  const existing = await getSessionSnapshot(sessionId);
  if (!existing) {
    return { ok: false as const, reason: 'SESSION_NOT_FOUND' };
  }
  if (!existing.players.includes(userId)) {
    return { ok: false as const, reason: 'NOT_SEATED' };
  }
  const result = removePlayerFromTable(existing, userId);
  if (!result.ok) {
    return { ok: false as const, reason: result.reason };
  }
  const saved = await saveState(result.state);
  await clearMatchAssignment(userId);
  return { ok: true as const, state: saved };
};

export const recordMatchForPlayers = async (
  sessionId: string,
  players: string[],
  mode: SessionState['mode'],
  buyIn: number
) => {
  await prisma.matchAssignment.createMany({
    data: players.map((userId) => ({ userId, sessionId, mode, buyIn })),
    skipDuplicates: true
  });
};

export const clearMatchAssignment = async (userId: string) => {
  await prisma.matchAssignment.deleteMany({ where: { userId } });
};

/** Enter queue once; pair humans or optionally spawn a bot. */
export const enterMatchmaking = async (
  ticket: MatchmakingTicket,
  opts?: MatchmakingOpts
): Promise<QueueStatus> => {
  const existing = await getQueueStatus(ticket.userId);
  if (existing.status === 'matched') return existing;

  const ready = await enqueueMatchmaking(ticket, opts);
  if (!ready) {
    const waiting = await getQueueStatus(ticket.userId);
    return waiting.status === 'waiting' ? waiting : { status: 'waiting', mode: ticket.mode, buyIn: ticket.buyIn };
  }

  const match = await createMatchFromQueue(ready, ticket.mode, ticket.buyIn);
  const humans = match.players.filter((id) => !id.startsWith(BOT_PREFIX));
  await recordMatchForPlayers(match.sessionId, humans, match.mode, match.buyIn);

  return {
    status: 'matched',
    sessionId: match.sessionId,
    mode: match.mode,
    buyIn: match.buyIn,
    players: match.players
  };
};
