import { Router } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import {
  catalogCosmetics,
  catalogGameModes,
  chipPackImages,
  clubsHeroBanner,
  lobbyHeroBanner,
  organizerPlanBanners,
  SUBSCRIPTION_PRICES_RUB,
  CHIP_PACK_PRICES_RUB,
  subscriptionBannerImages
} from '@duopoker/shared-types';
import { ORGANIZER_PLAN_PRICES_RUB, PLAN_LIMITS } from '../services/club-plans.js';
import { handleYooKassaWebhook } from '../services/yookassa.js';
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
    mockCheckout: config.mockCheckout,
    lobbyBannerUrl: lobbyHeroBanner,
    clubsBannerUrl: clubsHeroBanner,
    gameModes: catalogGameModes,
    subscriptions: [
      {
        tier: 'BRONZE',
        priceRubMonthly: SUBSCRIPTION_PRICES_RUB.BRONZE,
        ghostBoard: true,
        privateTables: true,
        stripePriceId: config.stripePriceBronze || undefined,
        imageUrl: subscriptionBannerImages.BRONZE
      },
      {
        tier: 'SILVER',
        priceRubMonthly: SUBSCRIPTION_PRICES_RUB.SILVER,
        chipsBonusPct: 50,
        stripePriceId: config.stripePriceSilver || undefined,
        imageUrl: subscriptionBannerImages.SILVER
      },
      {
        tier: 'GOLD',
        priceRubMonthly: SUBSCRIPTION_PRICES_RUB.GOLD,
        voiceChat: true,
        stripePriceId: config.stripePriceGold || undefined,
        imageUrl: subscriptionBannerImages.GOLD
      },
      {
        tier: 'PLATINUM',
        priceRubMonthly: SUBSCRIPTION_PRICES_RUB.PLATINUM,
        coach: true,
        stripePriceId: config.stripePricePlatinum || undefined,
        imageUrl: subscriptionBannerImages.PLATINUM
      },
      {
        tier: 'DIAMOND',
        priceRubMonthly: SUBSCRIPTION_PRICES_RUB.DIAMOND,
        rareCosmetics: true,
        stripePriceId: config.stripePriceDiamond || undefined,
        imageUrl: subscriptionBannerImages.DIAMOND
      },
      {
        tier: 'BLACK',
        priceRubMonthly: SUBSCRIPTION_PRICES_RUB.BLACK,
        apiStats: true,
        stripePriceId: config.stripePriceBlack || undefined,
        imageUrl: subscriptionBannerImages.BLACK
      }
    ],
    chipPacks: [
      {
        id: 'chips_2500',
        chips: 2500,
        priceRub: CHIP_PACK_PRICES_RUB.chips_2500,
        imageUrl: chipPackImages.chips_2500
      },
      {
        id: 'chips_10000',
        chips: 10000,
        priceRub: CHIP_PACK_PRICES_RUB.chips_10000,
        imageUrl: chipPackImages.chips_10000
      }
    ],
    organizerPlans: [
      {
        tier: 'BASIC',
        priceRubMonthly: 0,
        maxMembers: PLAN_LIMITS.BASIC.maxMembers,
        maxActiveTables: PLAN_LIMITS.BASIC.maxActiveTables,
        imageUrl: organizerPlanBanners.BASIC
      },
      {
        tier: 'PRO',
        priceRubMonthly: ORGANIZER_PLAN_PRICES_RUB.PRO,
        maxMembers: PLAN_LIMITS.PRO.maxMembers,
        maxActiveTables: PLAN_LIMITS.PRO.maxActiveTables,
        imageUrl: organizerPlanBanners.PRO
      },
      {
        tier: 'NETWORK',
        priceRubMonthly: ORGANIZER_PLAN_PRICES_RUB.NETWORK,
        maxMembers: PLAN_LIMITS.NETWORK.maxMembers,
        maxActiveTables: PLAN_LIMITS.NETWORK.maxActiveTables,
        imageUrl: organizerPlanBanners.NETWORK
      }
    ],
    cosmetics: catalogCosmetics,
    disclaimer:
      'Virtual chips and cosmetics are non-refundable and non-withdrawable. No real-money payouts, no rake, and no cashout.'
  });
});

monetizationRouter.post('/yookassa/webhook', async (req, res) => {
  try {
    const result = await handleYooKassaWebhook(req.body);
    return res.json({ received: true, ...result });
  } catch (e) {
    console.error('YooKassa webhook', e);
    return res.status(500).json({ error: 'Handler failed' });
  }
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
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const uid = req.auth!.userId;

    if (config.mockCheckout) {
      const url = `${config.publicWebUrl.replace(/\/$/, '')}/lobby?checkout=mock&success=1&tier=${encodeURIComponent(parsed.data.priceId)}`;
      return res.json({ id: 'mock_checkout_session', url });
    }

    if (!config.stripeSecretKey) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    const stripe = new Stripe(config.stripeSecretKey);
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
  if (config.isProduction && !config.mockCheckout) {
    return res.status(403).json({ error: 'Purchases must be confirmed via Stripe webhooks in production' });
  }
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
