import { Hono } from 'hono';
import { z } from 'zod';
import { tierHasPerk } from '@duopoker/shared-types';
import { authGuard } from '../middleware/auth.js';
import { config } from '../config.js';
import { resolveUserSubscriptionTier } from '../services/subscription-tier.js';
import { fallbackCoachHint, requestCoachHint } from '../services/coach-llm.js';

const hintSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.enum(['HOLDEM', 'JOKER', 'RASPISNOY']),
  street: z.string().min(1),
  heroCards: z.array(z.string()).max(7),
  communityCards: z.array(z.string()).max(5),
  pot: z.number().int().nonnegative(),
  legalActions: z.array(z.string()).optional()
});

const lastHintAt = new Map<string, number>();
const HINT_COOLDOWN_MS = 15_000;

export const coachRoutes = new Hono();

coachRoutes.get('/status', (c) =>
  c.json({
    enabled: Boolean(config.coachLlmApiKey) || !config.isProduction,
    minTier: 'PLATINUM',
    requiresAuth: true
  })
);

coachRoutes.post('/hint', authGuard, async (c) => {
  const userId = c.get('auth').userId;
  const tier = await resolveUserSubscriptionTier(userId);
  if (!tierHasPerk(tier, 'coach')) {
    return c.json({ error: 'Coach requires Platinum subscription or higher', code: 'TIER_REQUIRED' }, 403);
  }

  const now = Date.now();
  const prev = lastHintAt.get(userId) ?? 0;
  if (now - prev < HINT_COOLDOWN_MS) {
    return c.json({ error: 'Please wait before requesting another hint', code: 'RATE_LIMITED' }, 429);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = hintSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const ctx = parsed.data;
  let hint: string;
  try {
    if (config.coachLlmApiKey) {
      hint = await requestCoachHint(ctx, config.coachLlmApiKey, config.coachModel);
    } else if (!config.isProduction) {
      hint = fallbackCoachHint(ctx);
    } else {
      return c.json({ error: 'Coach LLM not configured' }, 503);
    }
  } catch (e) {
    console.error('coach hint', e);
    return c.json({ error: 'Could not generate hint' }, 502);
  }

  lastHintAt.set(userId, now);
  return c.json({ hint, playMoneyDisclaimer: true });
});
