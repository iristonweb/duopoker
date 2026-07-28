import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { config, allowDevMockCheckout } from '../config.js';
import { createVoiceRoomToken, isLiveKitConfigured } from '../services/livekit.js';
import { TIER_RANK } from '@duopoker/shared-types';
import { assertVoiceSessionAccess } from '../services/session-access.js';
import { resolveUserSubscriptionTier } from '../services/subscription-tier.js';

const tokenSchema = z.object({
  sessionId: z.string().min(1),
  displayName: z.string().min(1).max(64).optional()
});

const liveKitCfg = () => ({
  apiKey: config.livekitApiKey,
  apiSecret: config.livekitApiSecret,
  url: config.livekitUrl
});

export const voiceRoutes = new Hono();

voiceRoutes.get('/status', (c) => {
  const cfg = liveKitCfg();
  const configured = isLiveKitConfigured(cfg);
  return c.json({
    livekit: configured ? 'configured' : 'missing',
    minTier: allowDevMockCheckout() ? null : 'GOLD',
    requiresAuth: true
  });
});

voiceRoutes.post('/token', authGuard, async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  if (!allowDevMockCheckout()) {
    const tier = await resolveUserSubscriptionTier(userId);
    if (TIER_RANK[tier] < TIER_RANK.GOLD) {
      return c.json({ error: 'Voice chat requires Gold subscription or higher', code: 'TIER_REQUIRED' }, 403);
    }
  }

  const access = await assertVoiceSessionAccess(parsed.data.sessionId, userId);
  if (!access.ok) {
    return c.json({ error: access.reason, code: access.reason }, 403);
  }

  const cfg = liveKitCfg();
  if (!isLiveKitConfigured(cfg)) {
    return c.json(
      {
        error: 'LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL.'
      },
      503
    );
  }

  const { sessionId, displayName } = parsed.data;
  const result = await createVoiceRoomToken(cfg, { sessionId, userId, displayName });
  return c.json(result);
});
