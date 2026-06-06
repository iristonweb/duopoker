import { z } from 'zod';
import type { SessionState } from '@duopoker/shared-types/index';
import { normalizeSessionState } from './normalize-state';

const jokerHandStateSchema = z
  .object({
    matchHandIndex: z.number(),
    cardsThisDeal: z.number(),
    pool: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    trumpSuit: z.enum(['S', 'H', 'D', 'C']).nullable().optional(),
    trumpCard: z.string().optional(),
    bids: z.record(z.number()).optional(),
    tricksWon: z.record(z.number()).optional(),
    scores: z.record(z.number()).optional(),
    currentTrick: z.array(z.object({ userId: z.string(), card: z.string() })).optional(),
    trickNumber: z.number().optional(),
    handPoints: z.record(z.number()).optional(),
    dealHistory: z.array(z.unknown()).optional()
  })
  .passthrough();

/** Runtime guard for JSON persisted in game_sessions.gameState. */
export const sessionStateSchema = z
  .object({
    sessionId: z.string().min(1),
    mode: z.enum(['HOLDEM', 'JOKER', 'RASPISNOY']),
    players: z.array(z.string()),
    handNumber: z.number(),
    street: z.string(),
    stacks: z.record(z.number()),
    pot: z.number().optional(),
    playerCards: z.record(z.array(z.string())).optional(),
    joker: jokerHandStateSchema.optional(),
    actionLog: z.array(z.unknown()).optional(),
    winners: z.array(z.string()).optional(),
    winnersShare: z.record(z.number()).optional()
  })
  .passthrough();

export const parseLoadedSessionState = (raw: unknown): SessionState | null => {
  const parsed = sessionStateSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[session-schema] invalid persisted gameState', parsed.error.flatten());
    return null;
  }
  return normalizeSessionState(parsed.data as unknown as SessionState);
};
