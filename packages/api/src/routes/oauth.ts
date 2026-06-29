import { Hono } from 'hono';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { resolveUniqueNickname } from '@duopoker/server-shared/lib/nickname';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import { issueOAuthSession } from '../lib/oauth-session.js';
import { verifyAppleIdentityToken } from '@duopoker/server-core/oauth/apple';

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

export const oauthRoutes = new Hono();

oauthRoutes.get('/google/status', (c) =>
  c.json({ enabled: config.oauthGoogleEnabled && Boolean(config.googleClientId) })
);

oauthRoutes.get('/apple/status', (c) =>
  c.json({ enabled: config.oauthAppleEnabled && Boolean(config.appleClientId) })
);

oauthRoutes.post('/google', async (c) => {
  if (!config.googleClientId) {
    return c.json({ error: 'Google OAuth not configured' }, 503);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = googleBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const client = new OAuth2Client(config.googleClientId);
  const ticket = await client.verifyIdToken({
    idToken: parsed.data.idToken,
    audience: config.googleClientId
  });
  const payload = ticket.getPayload();
  const email = payload?.email;
  if (!email) {
    return c.json({ error: 'No email on Google token' }, 400);
  }

  const name = payload.name ?? email.split('@')[0]!;
  const nickname = await resolveUniqueNickname(prisma, name, email);
  const user = await prisma.user.upsert({
    where: { email },
    update: { displayName: name },
    create: { email, displayName: name, nickname, emailVerified: true }
  });

  const deviceId = c.req.header('x-device-id') ?? 'oauth-google';
  const tokens = await issueOAuthSession(user.id, user.email, deviceId);
  return c.json({
    ...tokens,
    user: { id: user.id, email: user.email, displayName: user.displayName, nickname: user.nickname }
  });
});

oauthRoutes.post('/apple', async (c) => {
  if (!config.oauthAppleEnabled || !config.appleClientId) {
    return c.json({ error: 'Apple Sign-In not configured' }, 503);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = appleBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
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

  const deviceId = c.req.header('x-device-id') ?? 'oauth-apple';
  const tokens = await issueOAuthSession(user.id, user.email, deviceId);
  return c.json({
    ...tokens,
    user: { id: user.id, email: user.email, displayName: user.displayName, nickname: user.nickname }
  });
});
