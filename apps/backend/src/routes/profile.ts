import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth-guard.js';
import { isValidNickname, normalizeNicknameInput } from '@duopoker/server-shared/lib/nickname';
import { prisma } from '../services/prisma.js';

const profileSchema = z.object({
  displayName: z.string().min(2),
  avatar: z.string().url().optional()
});

const nicknameSchema = z.object({ nickname: z.string().min(3).max(20) });

export const profileRouter = Router();
profileRouter.use(authGuard);

profileRouter.get('/me/nickname', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, nickname: true, displayName: true }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

profileRouter.put('/me/nickname', async (req, res) => {
  const userId = req.auth!.userId;
  const parsed = nicknameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const nickname = normalizeNicknameInput(parsed.data.nickname);
  if (!isValidNickname(nickname)) {
    return res.status(400).json({ error: 'Invalid nickname format' });
  }

  const existing = await prisma.user.findUnique({ where: { nickname } });
  if (existing && existing.id !== userId) {
    return res.status(409).json({ error: 'Nickname already taken' });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { nickname },
    select: { id: true, nickname: true, displayName: true }
  });
  return res.json(updated);
});

profileRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      nickname: true,
      avatar: true,
      chips: true,
      level: true,
      xp: true
    }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({
    ...user,
    complianceDisclaimer: 'Virtual chips are not redeemable for real money.'
  });
});

profileRouter.put('/:id', async (req, res) => {
  if (req.auth?.userId !== req.params.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: {
      id: true,
      email: true,
      displayName: true,
      nickname: true,
      avatar: true,
      chips: true,
      level: true,
      xp: true
    }
  });
  return res.json(updated);
});
