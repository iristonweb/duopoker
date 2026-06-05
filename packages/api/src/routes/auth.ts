import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../auth/jwt.js';
import { AppError } from '../errors.js';
import { prisma } from '../lib/prisma.js';

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
  const body = await c.req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return c.json({ error: 'Email already registered' }, 409);
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      displayName: parsed.data.displayName
    }
  });
  const deviceId = c.req.header('x-device-id') ?? 'web';
  const tokens = await issueSession(user.id, user.email, deviceId);
  return c.json(
    { ...tokens, user: { id: user.id, email: user.email, displayName: user.displayName } },
    201
  );
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = authSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.passwordHash) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  const deviceId = c.req.header('x-device-id') ?? 'web';
  const tokens = await issueSession(user.id, user.email, deviceId);
  return c.json({
    ...tokens,
    user: { id: user.id, email: user.email, displayName: user.displayName }
  });
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
    const status = error instanceof AppError ? error.statusCode : 401;
    return c.json({ error: 'Invalid session' }, status);
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
      select: { id: true, email: true, displayName: true, chips: true, level: true, xp: true }
    });
    return c.json({ user });
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
