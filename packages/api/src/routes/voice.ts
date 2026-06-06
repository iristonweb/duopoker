import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { config } from '../config.js';
import { createVoiceRoomToken, isLiveKitConfigured } from '../services/livekit.js';
import { assertVoiceSessionAccess } from '../services/session-access.js';

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
  return c.json({ livekit: isLiveKitConfigured(cfg) ? 'configured' : 'missing' });
});

voiceRoutes.post('/token', authGuard, async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
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
