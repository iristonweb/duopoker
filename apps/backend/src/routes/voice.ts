import { Router } from 'express';
import { z } from 'zod';
import { verifyAccessToken } from '../auth/jwt.js';
import { config } from '../config.js';
import { createVoiceRoomToken, isLiveKitConfigured } from '../services/livekit.js';

const tokenSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  displayName: z.string().min(1).max(64).optional()
});

export const voiceRouter = Router();

voiceRouter.get('/status', (_req, res) => {
  const cfg = {
    apiKey: config.livekitApiKey,
    apiSecret: config.livekitApiSecret,
    url: config.livekitUrl
  };
  const configured = isLiveKitConfigured(cfg);
  res.json({
    livekit: configured ? 'configured' : 'missing',
    checks: {
      apiKey: Boolean(cfg.apiKey),
      apiSecret: Boolean(cfg.apiSecret),
      url: Boolean(cfg.url)
    }
  });
});

voiceRouter.post('/token', async (req, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const authHeader = req.headers.authorization ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (bearer) {
    try {
      const payload = verifyAccessToken(bearer);
      if (payload.userId !== parsed.data.userId) {
        return res.status(403).json({ error: 'userId mismatch' });
      }
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const cfg = {
    apiKey: config.livekitApiKey,
    apiSecret: config.livekitApiSecret,
    url: config.livekitUrl
  };
  if (!isLiveKitConfigured(cfg)) {
    return res.status(503).json({
      error: 'LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL on the server.'
    });
  }

  const result = await createVoiceRoomToken(cfg, parsed.data);
  return res.json(result);
});
