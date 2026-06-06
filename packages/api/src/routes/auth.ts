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
import { isValidNickname, normalizeNicknameInput } from '../lib/nickname.js';
import { decryptProfileRow } from '../lib/profile-privacy.js';
import { jsonError } from '../lib/http-error.js';
import { isFounderEmail, resolveUserRole, syncFounderPrivileges } from '../services/admin-access.js';
import {
  activatePendingReferralsForUser,
  attachReferralOnSignup,
  ensureReferralCode
} from '../services/referrals.js';
import { resolveUserSubscriptionTier } from '../services/subscription-tier.js';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(40),
  nickname: z.string().min(3).max(20),
  referralCode: z.string().min(3).max(24).optional()
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
        fieldErrors.nickname?.[0] ??
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
    const nickname = normalizeNicknameInput(parsed.data.nickname);
    if (!isValidNickname(nickname)) {
      return c.json(
        { error: 'Nickname must be 3-20 chars: lowercase letter first, then letters, numbers, underscore' },
        400
      );
    }
    const nicknameTaken = await prisma.user.findUnique({ where: { nickname } });
    if (nicknameTaken) {
      return c.json({ error: 'Nickname already taken' }, 409);
    }
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        passwordHash,
        displayName: parsed.data.displayName,
        nickname,
        emailVerified: !verify,
        verificationToken,
        verificationTokenExpiresAt: verify ? verificationExpiresAt() : null
      },
      select: { id: true, email: true, displayName: true, nickname: true, emailVerified: true, role: true }
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
    await ensureReferralCode(user.id, user.nickname);
    let referralWarning: string | undefined;
    if (parsed.data.referralCode) {
      const refResult = await attachReferralOnSignup(user.id, parsed.data.referralCode);
      if (!refResult.ok) referralWarning = refResult.error;
    }
    const role =
      (await resolveUserRole(user.id, user.email, { bootstrapFounder: true })) ?? user.role;
    return c.json(
      {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          nickname: user.nickname,
          emailVerified: user.emailVerified,
          role
        },
        verificationRequired: verify && !user.emailVerified,
        referralWarning
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
    const user = await prisma.user.findFirst({
      where: { email: { equals: parsed.data.email, mode: 'insensitive' } },
      select: { id: true, email: true, passwordHash: true, displayName: true, nickname: true, emailVerified: true, role: true }
    });
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
    const role =
      (await resolveUserRole(user.id, user.email, { bootstrapFounder: true })) ?? user.role;
    return c.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        nickname: user.nickname,
        emailVerified: user.emailVerified,
        role
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
  await activatePendingReferralsForUser(user.id);
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
    const emailRow = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { email: true }
    });
    if (emailRow && isFounderEmail(emailRow.email)) {
      await syncFounderPrivileges(emailRow.email);
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        avatar: true,
        tableStatus: true,
        chips: true,
        level: true,
        xp: true,
        gamesPlayed: true,
        gamesWon: true,
        gamesLost: true,
        emailVerified: true,
        role: true,
        subscriptions: {
          where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
          select: { tier: true, expiresAt: true, status: true }
        },
        inventory: {
          select: { itemId: true, equipped: true, rarity: true }
        }
      }
    });
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const role = (await resolveUserRole(user.id, user.email)) ?? user.role;
    await ensureReferralCode(user.id, user.nickname);
    const { subscriptions, inventory, ...profile } = user;
    const effectiveTier = await resolveUserSubscriptionTier(user.id);
    const topSub = subscriptions.find((s) => s.tier === effectiveTier) ?? subscriptions[0] ?? null;
    return c.json({
      user: { ...decryptProfileRow(profile), role },
      subscription: topSub,
      inventory,
      stats: {
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost
      }
    });
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
