import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { config } from '../config.js';
import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { redis } from '../services/redis.js';
import { resolveUniqueNickname } from '../lib/nickname.js';
import { prisma } from '../services/prisma.js';

export const oauthRouter = Router();

const googleBody = z.object({ idToken: z.string().min(10) });

oauthRouter.get('/google/status', (_req, res) => {
  res.json({ enabled: config.oauthGoogleEnabled && Boolean(config.googleClientId) });
});

oauthRouter.get('/apple/status', (_req, res) => {
  res.json({ enabled: config.oauthAppleEnabled });
});

oauthRouter.post('/google', async (req, res, next) => {
  try {
    if (!config.googleClientId) {
      return res.status(503).json({ error: 'Google OAuth not configured' });
    }
    const parsed = googleBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: config.googleClientId
    });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email) {
      return res.status(400).json({ error: 'No email on Google token' });
    }

    const name = payload.name ?? email.split('@')[0]!;
    const nickname = await resolveUniqueNickname(prisma, name, email);
    const user = await prisma.user.upsert({
      where: { email },
      update: { displayName: name },
      create: {
        email,
        displayName: name,
        nickname
      }
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    await redis.set(`session:${user.id}`, refreshToken, 'EX', 60 * 60 * 24 * 30);
    await prisma.deviceSession.deleteMany({ where: { userId: user.id } });
    await prisma.deviceSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceId: req.headers['x-device-id']?.toString() ?? 'oauth-google',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.displayName }
    });
  } catch (e) {
    return next(e);
  }
});

/** Placeholder — production needs Apple JWKS validation + client secret flow. */
oauthRouter.post('/apple', (_req, res) => {
  return res.status(501).json({ error: 'Apple Sign-In requires server-side token validation (JWKS)' });
});
