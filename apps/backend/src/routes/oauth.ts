import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { config } from '../config.js';
import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { redis } from '../services/redis.js';
import { resolveUniqueNickname } from '@duopoker/server-shared/lib/nickname';
import { prisma } from '../services/prisma.js';
import { verifyAppleIdentityToken } from '@duopoker/server-core/oauth/apple';

export const oauthRouter = Router();

const googleBody = z.object({ idToken: z.string().min(10) });

const appleBody = z.object({
  identityToken: z.string().min(10),
  fullName: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional()
    })
    .optional()
});

oauthRouter.get('/google/status', (_req, res) => {
  res.json({ enabled: config.oauthGoogleEnabled && Boolean(config.googleClientId) });
});

oauthRouter.get('/apple/status', (_req, res) => {
  res.json({ enabled: config.oauthAppleEnabled && Boolean(config.appleClientId) });
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

oauthRouter.post('/apple', async (req, res, next) => {
  try {
    if (!config.oauthAppleEnabled || !config.appleClientId) {
      return res.status(503).json({ error: 'Apple Sign-In not configured' });
    }
    const parsed = appleBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const identity = await verifyAppleIdentityToken(parsed.data.identityToken, config.appleClientId);
    const displayName =
      [parsed.data.fullName?.givenName, parsed.data.fullName?.familyName].filter(Boolean).join(' ') ||
      'Player';
    const email =
      identity.email && String(identity.email_verified) !== 'false'
        ? identity.email
        : `apple+${identity.sub}@users.duopoker.internal`;

    let user = await prisma.user.findUnique({ where: { appleSub: identity.sub } });
    if (!user && identity.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { appleSub: identity.sub }
        });
      }
    }
    if (!user) {
      const nickname = await resolveUniqueNickname(prisma, displayName, email);
      user = await prisma.user.create({
        data: {
          email,
          appleSub: identity.sub,
          displayName,
          nickname,
          emailVerified: true
        }
      });
    }

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });
    await redis.set(`session:${user.id}`, refreshToken, 'EX', 60 * 60 * 24 * 30);
    await prisma.deviceSession.deleteMany({ where: { userId: user.id } });
    await prisma.deviceSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceId: req.headers['x-device-id']?.toString() ?? 'oauth-apple',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    return res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, displayName: user.displayName, nickname: user.nickname }
    });
  } catch (e) {
    return next(e);
  }
});
