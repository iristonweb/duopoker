import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { config } from '../config.js';
import { authGuard } from '../middleware/auth-guard.js';
import { creditDailyBonus, recordPurchase } from '../services/monetization.js';
import { prisma } from '../services/prisma.js';

const bonusSchema = z.object({ userId: z.string(), amount: z.number().int().positive() });
const purchaseSchema = z.object({
  userId: z.string(),
  itemId: z.string(),
  provider: z.enum(['stripe', 'apple_iap', 'google_play']),
  amount: z.number().int().positive(),
  providerEventId: z.string().min(4)
});

const checkoutSchema = z.object({
  priceId: z.string().min(1),
  mode: z.enum(['subscription', 'payment']),
  itemId: z.string().optional()
});

export const monetizationRouter = Router();

monetizationRouter.get('/catalog', (_req, res) => {
  res.json({
    subscriptions: [
      { tier: 'SILVER', priceUsd: 4.99, chipsBonusPct: 50 },
      { tier: 'GOLD', priceUsd: 9.99, voiceChat: true },
      { tier: 'PLATINUM', priceUsd: 19.99, coach: true },
      { tier: 'ROYAL', priceUsd: 49.99, apiStats: true }
    ],
    chipPacks: [
      { id: 'chips_2500', chips: 2500, priceUsd: 2.99 },
      { id: 'chips_10000', chips: 10000, priceUsd: 9.99 }
    ],
    cosmetics: [
      { id: 'deck_neon', name: 'Neon deck backs', rarity: 'RARE', chipCost: 1800 },
      { id: 'table_void', name: 'Void table', rarity: 'EPIC', chipCost: 4500 },
      { id: 'frame_gold', name: 'Gold avatar frame', rarity: 'LEGENDARY', chipCost: 9000 }
    ],
    disclaimer: 'Virtual chips and cosmetics are non-refundable and non-withdrawable.'
  });
});

monetizationRouter.use(authGuard);

const cosmeticCosts: Record<string, number> = {
  deck_neon: 1800,
  table_void: 4500,
  frame_gold: 9000
};

monetizationRouter.post('/shop/cosmetic', async (req, res, next) => {
  try {
    const itemId = z.string().min(1).parse(req.body?.itemId);
    const cost = cosmeticCosts[itemId];
    if (!cost) return res.status(400).json({ error: 'Unknown cosmetic' });
    const uid = req.auth!.userId;
    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user || user.chips < cost) {
      return res.status(400).json({ error: 'Insufficient chips' });
    }
    const rarity = cost >= 8000 ? 'LEGENDARY' : cost >= 4000 ? 'EPIC' : 'RARE';
    await prisma.$transaction([
      prisma.user.update({ where: { id: uid }, data: { chips: { decrement: cost } } }),
      prisma.userItem.create({
        data: { userId: uid, itemId, rarity, equipped: false }
      })
    ]);
    return res.json({ ok: true, itemId });
  } catch (e) {
    return next(e);
  }
});

monetizationRouter.post('/checkout-session', async (req, res, next) => {
  try {
    if (!config.stripeSecretKey) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const stripe = new Stripe(config.stripeSecretKey);
    const uid = req.auth!.userId;
    const session = await stripe.checkout.sessions.create({
      mode: parsed.data.mode,
      client_reference_id: uid,
      metadata: {
        userId: uid,
        itemId: parsed.data.itemId ?? ''
      },
      line_items: [{ price: parsed.data.priceId, quantity: 1 }],
      success_url: `${config.publicWebUrl}/lobby?checkout=success`,
      cancel_url: `${config.publicWebUrl}/lobby?checkout=cancel`
    });
    return res.json({ id: session.id, url: session.url });
  } catch (e) {
    return next(e);
  }
});

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
