import { applyAction, createInitialState, createReplayTimeline, nextPhase } from '@duopoker/game-engine/index';
import type { MatchmakingTicket, PlayerAction, SessionState } from '@duopoker/shared-types/index';

const sessions = new Map<string, SessionState>();
const actionCounters = new Map<string, { second: number; count: number }>();
const queue: MatchmakingTicket[] = [];

const RATE_LIMIT_PER_SECOND = 20;

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

export const ensureSessionState = (sessionId: string, mode: SessionState['mode']) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, createInitialState(sessionId, mode));
  }
  return sessions.get(sessionId)!;
};

export const processPlayerAction = (action: PlayerAction) => {
  if (!canAcceptAction(action.userId)) {
    return { rejected: true as const, reason: 'RATE_LIMITED' };
  }

  const existing = sessions.get(action.sessionId) ?? createInitialState(action.sessionId, 'HOLDEM');
  const withPot = applyAction(existing, action);
  const next = { ...withPot, phase: nextPhase(withPot.phase) };
  sessions.set(action.sessionId, next);
  return { rejected: false as const, state: next, replay: createReplayTimeline(next) };
};

export const enqueueMatchmaking = (ticket: MatchmakingTicket) => {
  queue.push(ticket);
  const compatible = queue.filter((q) => q.mode === ticket.mode && q.buyIn === ticket.buyIn).slice(0, 6);
  if (compatible.length < 2) return null;
  compatible.forEach((item) => {
    const idx = queue.findIndex((q) => q.userId === item.userId && q.createdAt === item.createdAt);
    if (idx >= 0) queue.splice(idx, 1);
  });
  return compatible;
};

export const getSessionSnapshot = (sessionId: string): SessionState | null => sessions.get(sessionId) ?? null;
