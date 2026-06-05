import { Hono } from 'hono';
import { z } from 'zod';
import { verifyAccessToken } from '../auth/jwt.js';
import { config } from '../config.js';
import { createVoiceRoomToken, isLiveKitConfigured } from '../services/livekit.js';

const tokenSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
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

voiceRoutes.post('/token', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const authHeader = c.req.header('authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer /, '');
  if (bearer) {
    try {
      const payload = verifyAccessToken(bearer);
      if (payload.userId !== parsed.data.userId) {
        return c.json({ error: 'userId mismatch' }, 403);
      }
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }
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

  const { sessionId, userId, displayName } = parsed.data;
  const result = await createVoiceRoomToken(cfg, { sessionId, userId, displayName });
  return c.json(result);
});
