import { Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth-guard.js';
import { creditDailyBonus, recordPurchase } from '../services/monetization.js';

const bonusSchema = z.object({ userId: z.string(), amount: z.number().int().positive() });
const purchaseSchema = z.object({
  userId: z.string(),
  itemId: z.string(),
  provider: z.enum(['stripe', 'apple_iap', 'google_play']),
  amount: z.number().int().positive(),
  providerEventId: z.string().min(4)
});

export const monetizationRouter = Router();
monetizationRouter.use(authGuard);

monetizationRouter.post('/bonus', async (req, res) => {
  const parsed = bonusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.userId !== req.auth?.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await creditDailyBonus(parsed.data.userId, parsed.data.amount);
  return res.json({ ok: true });
});

monetizationRouter.post('/purchase', async (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.userId !== req.auth?.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await recordPurchase(
    parsed.data.userId,
    parsed.data.itemId,
    parsed.data.provider,
    parsed.data.amount,
    parsed.data.providerEventId
  );
  return res.json({ ok: true });
});
