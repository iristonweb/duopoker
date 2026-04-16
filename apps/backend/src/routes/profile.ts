import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth-guard.js';
import { prisma } from '../services/prisma.js';

const profileSchema = z.object({
  displayName: z.string().min(2),
  avatar: z.string().url().optional()
});

export const profileRouter = Router();
profileRouter.use(authGuard);

profileRouter.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, displayName: true, avatar: true, chips: true, level: true, xp: true }
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
    select: { id: true, email: true, displayName: true, avatar: true, chips: true, level: true, xp: true }
  });
  return res.json(updated);
});
