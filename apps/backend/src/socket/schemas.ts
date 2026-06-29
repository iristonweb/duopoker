import { z } from 'zod';
import { normalizeGameMode } from '@duopoker/shared-types/index';

export const gameModeSchema = z.preprocess(
  (v) => (typeof v === 'string' ? normalizeGameMode(v as 'HOLDEM' | 'JOKER' | 'RASPISNOY') : v),
  z.enum(['HOLDEM', 'JOKER'])
);

export const joinSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  mode: gameModeSchema.default('HOLDEM'),
  buyIn: z.number().int().positive().default(100)
});

export const actionSchema = z.object({
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

export const matchmakingSchema = z.object({
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

export const tableChatSendSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().trim().min(1).max(280)
});
