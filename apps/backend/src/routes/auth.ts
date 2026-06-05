import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../auth/jwt.js';
import { AppError } from '../errors.js';
import { config } from '../config.js';
import { redis } from '../services/redis.js';
import { prisma } from '../services/prisma.js';
import { resolveUniqueNickname } from '../lib/nickname.js';
import {
  createVerificationToken,
  sendVerificationEmail,
  shouldVerifyEmail,
  verificationExpiresAt
} from '../services/email.js';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2)
});

export const authRouter = Router();

const issueSession = async (
  userId: string,
  email: string,
  req: { headers: { [k: string]: string | string[] | undefined } }
) => {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, email });
  await redis.set(`session:${userId}`, refreshToken, 'EX', 60 * 60 * 24 * 30);
  await prisma.deviceSession.deleteMany({ where: { userId } });
  await prisma.deviceSession.create({
    data: {
      userId,
      refreshToken,
      deviceId: req.headers['x-device-id']?.toString() ?? 'web',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });
  return { accessToken, refreshToken };
};

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
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
    if (verify && verificationToken) {
      try {
        await sendVerificationEmail(user.email, verificationToken);
      } catch (err) {
        console.error('verification email failed', err);
      }
    }
    const tokens = await issueSession(user.id, user.email, req);
    return res.status(201).json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        nickname: user.nickname,
        emailVerified: user.emailVerified
      },
      verificationRequired: verify && !user.emailVerified
    });
  } catch (e) {
    return next(e);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user?.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (config.requireEmailVerification && !user.emailVerified) {
      return res.status(403).json({
        error: 'Email not verified. Check your inbox for the verification link.'
      });
    }
    const tokens = await issueSession(user.id, user.email, req);
    return res.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        nickname: user.nickname,
        emailVerified: user.emailVerified
      }
    });
  } catch (e) {
    return next(e);
  }
});

authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const token = z.string().min(1).parse(req.query.token);
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiresAt: { gt: new Date() }
      }
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiresAt: null
      }
    });
    return res.json({ ok: true, email: user.email });
  } catch (e) {
    return next(e);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = z.string().min(1).parse(req.body?.refreshToken);
    const payload = verifyRefreshToken(refreshToken);
    const storedToken = await redis.get(`session:${payload.userId}`);
    const deviceOk = await prisma.deviceSession.findFirst({
      where: {
        userId: payload.userId,
        refreshToken,
        expiresAt: { gt: new Date() }
      }
    });
    if ((!storedToken || storedToken !== refreshToken) && !deviceOk) {
      throw new AppError('Invalid session', 401);
    }

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    const nextRefresh = signRefreshToken({ userId: payload.userId, email: payload.email });
    await redis.set(`session:${payload.userId}`, nextRefresh, 'EX', 60 * 60 * 24 * 30);
    await prisma.deviceSession.updateMany({
      where: { userId: payload.userId, refreshToken },
      data: { refreshToken: nextRefresh }
    });

    return res.json({ accessToken, refreshToken: nextRefresh });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = z.string().min(1).parse(req.body?.refreshToken);
    const payload = verifyRefreshToken(refreshToken);
    await redis.del(`session:${payload.userId}`);
    await prisma.deviceSession.deleteMany({ where: { userId: payload.userId, refreshToken } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRouter.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace('Bearer ', '');
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
    return res.json({ user });
  } catch {
    return next(new AppError('Unauthorized', 401));
  }
});
