import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../auth/jwt.js';
import { AppError } from '../errors.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import {
  createVerificationToken,
  sendVerificationEmail,
  shouldVerifyEmail,
  verificationExpiresAt
} from '../services/email.js';
import { resolveUniqueNickname } from '../lib/nickname.js';
import { jsonError } from '../lib/http-error.js';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2)
});

const issueSession = async (userId: string, email: string, deviceId: string) => {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, email });
  await prisma.deviceSession.deleteMany({ where: { userId } });
  await prisma.deviceSession.create({
    data: {
      userId,
      refreshToken,
      deviceId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });
  return { accessToken, refreshToken };
};

export const authRoutes = new Hono();

authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const first =
        fieldErrors.password?.[0] ??
        fieldErrors.email?.[0] ??
        fieldErrors.displayName?.[0] ??
        'Invalid registration data';
      return c.json({ error: first, details: parsed.error.flatten() }, 400);
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409);
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const verify = shouldVerifyEmail();
    const verificationToken = verify ? createVerificationToken() : null;
    const tempId = `tmp_${Date.now()}`;
    const nickname = await resolveUniqueNickname(prisma, parsed.data.displayName, tempId);
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        displayName: parsed.data.displayName,
        nickname,
        emailVerified: !verify,
        verificationToken,
        verificationTokenExpiresAt: verify ? verificationExpiresAt() : null
      }
    });
    if (verify && verificationToken && config.resendApiKey) {
      try {
        await sendVerificationEmail(user.email, verificationToken);
      } catch (err) {
        console.error('verification email failed', err);
      }
    }
    const deviceId = c.req.header('x-device-id') ?? 'web';
    const tokens = await issueSession(user.id, user.email, deviceId);
    return c.json(
      {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          nickname: user.nickname,
          emailVerified: user.emailVerified
        },
        verificationRequired: verify && !user.emailVerified
      },
      201
    );
  } catch (error) {
    return jsonError(c, error);
  }
});

authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid email or password' }, 400);
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user?.passwordHash) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    if (config.requireEmailVerification && !user.emailVerified) {
      return c.json({ error: 'Email not verified. Check your inbox for the verification link.' }, 403);
    }
    const deviceId = c.req.header('x-device-id') ?? 'web';
    const tokens = await issueSession(user.id, user.email, deviceId);
    return c.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    return jsonError(c, error);
  }
});

authRoutes.get('/verify-email', async (c) => {
  const token = c.req.query('token');
  if (!token) {
    return c.json({ error: 'Missing token' }, 400);
  }
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiresAt: { gt: new Date() }
    }
  });
  if (!user) {
    return c.json({ error: 'Invalid or expired verification token' }, 400);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null
    }
  });
  return c.json({ ok: true, email: user.email });
});

authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = z.string().min(1).parse(body?.refreshToken);
    const payload = verifyRefreshToken(refreshToken);
    const stored = await prisma.deviceSession.findFirst({
      where: {
        userId: payload.userId,
        refreshToken,
        expiresAt: { gt: new Date() }
      }
    });
    if (!stored) {
      throw new AppError('Invalid session', 401);
    }

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    const nextRefresh = signRefreshToken({ userId: payload.userId, email: payload.email });
    await prisma.deviceSession.updateMany({
      where: { userId: payload.userId, refreshToken },
      data: { refreshToken: nextRefresh, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) }
    });

    return c.json({ accessToken, refreshToken: nextRefresh });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      return c.json({ error: 'Invalid session' }, 401);
    }
    return c.json({ error: 'Invalid session' }, 500);
  }
});

authRoutes.post('/logout', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const refreshToken = z.string().min(1).parse(body?.refreshToken);
    const payload = verifyRefreshToken(refreshToken);
    await prisma.deviceSession.deleteMany({ where: { userId: payload.userId, refreshToken } });
    return c.body(null, 204);
  } catch {
    return c.json({ error: 'Invalid session' }, 401);
  }
});

authRoutes.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('authorization') ?? '';
    const token = authHeader.replace(/^Bearer /, '');
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        avatar: true,
        chips: true,
        level: true,
        xp: true,
        emailVerified: true
      }
    });
    return c.json({ user });
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
