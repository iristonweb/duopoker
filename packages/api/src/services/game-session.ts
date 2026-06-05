import {
  addPlayerToTable,
  applyTableAction,
  autoFoldActivePlayer,
  createInitialTableState,
  createReplayTimeline,
  markReadyForNextHand,
  normalizeSessionState,
  startNewHand
} from '@duopoker/game-engine/index';
import type { MatchmakingTicket, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { config } from '../config.js';
import { loadGameSnapshot, persistGameSnapshot } from './session-persistence.js';
import { prisma } from '../lib/prisma.js';

export const BOT_PREFIX = 'duopoker-bot';

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
export const joinTable = async (
  sessionId: string,
  userId: string,
  mode: SessionState['mode'],
  buyIn: number
) => {
  let state = await ensureSessionState(sessionId, mode, buyIn);
  state = addPlayerToTable(state, userId);
  if (state.players.length >= 2 && state.street === 'LOBBY') {
    state = startNewHand(state);
  }
  await persistGameSnapshot(state);
  return state;
};

export const processPlayerAction = async (action: PlayerAction) => {
  const existing = await getSessionSnapshot(action.sessionId);
  if (!existing) {
    return { rejected: true as const, reason: 'SESSION_NOT_FOUND' };
  }

  const result = applyTableAction(existing, action);
  if (!result.ok) {
    return { rejected: true as const, reason: result.reason };
  }

  await persistGameSnapshot(result.state);
  return {
    rejected: false as const,
    state: result.state,
    replay: createReplayTimeline(result.state)
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
  await persistGameSnapshot(result.state);
  return { ok: true as const, state: result.state, started: result.started };
};

export const enqueueMatchmaking = async (
  ticket: MatchmakingTicket,
  opts?: { allowSoloQueue?: boolean }
): Promise<MatchmakingTicket[] | null> => {
  const allowSolo = opts?.allowSoloQueue === true;

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

/** Advances through consecutive bot turns (check → call → fold). */
export const advanceBotTurns = async (sessionId: string): Promise<SessionState | null> => {
  let last: SessionState | null = null;
  for (let i = 0; i < 48; i += 1) {
    const state = await getSessionSnapshot(sessionId);
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
  await persistGameSnapshot(result.state);
  const botState = await advanceBotTurns(sessionId);
  return botState ?? result.state;
};

export const createMatchFromQueue = async (
  ready: MatchmakingTicket[],
  mode: SessionState['mode'],
  buyIn: number
) => {
  const sessionId = `sess-${Date.now()}`;
  const hasBot = ready.some((r) => r.userId.startsWith(BOT_PREFIX));

  if (hasBot) {
    const humanId = ready.find((r) => !r.userId.startsWith(BOT_PREFIX))!.userId;
    const botId = ready.find((r) => r.userId.startsWith(BOT_PREFIX))!.userId;
    await joinTable(sessionId, humanId, mode, buyIn);
    await joinTable(sessionId, botId, mode, buyIn);
    await advanceBotTurns(sessionId);
  }

  return {
    sessionId,
    players: ready.map((r) => r.userId),
    mode,
    buyIn
  };
};

export const matchmakingAllowsSolo = () => config.allowSoloQueue;
