import { Hono } from 'hono';
import Stripe from 'stripe';
import { z } from 'zod';
import {
  catalogCosmetics,
  catalogGameModes,
  chipPackImages,
  clubsHeroBanner,
  lobbyHeroBanner,
  lobbyPreviewBanner,
  organizerPlanBanners,
  subscriptionBannerImages
} from '@duopoker/shared-types';
import { ORGANIZER_PLAN_PRICES_RUB, PLAN_LIMITS } from '../services/club-plans.js';
import { handleYooKassaWebhook } from '../services/yookassa.js';
import { config, allowDevMockCheckout } from '../config.js';
import { authGuard } from '../middleware/auth.js';
import { claimDailyBonus, recordPurchase } from '../services/monetization.js';
import { prisma } from '../lib/prisma.js';

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

const mockSubscribeSchema = z.object({
  tier: z.enum(['SILVER', 'GOLD', 'PLATINUM', 'ROYAL'])
});

const subscriptionTiers = ['SILVER', 'GOLD', 'PLATINUM', 'ROYAL'] as const;
type PaidTier = (typeof subscriptionTiers)[number];

const tierFromToken = (token: string): PaidTier | null => {
  const upper = token.toUpperCase();
  if (subscriptionTiers.includes(upper as PaidTier)) return upper as PaidTier;
  return tierFromPrice(token);
};

const activateSubscription = async (userId: string, tier: PaidTier) => {
  const subId = `${userId}-${tier}`;
  await prisma.subscription.upsert({
    where: { id: subId },
    create: {
      id: subId,
      userId,
      tier,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 32)
    },
    update: {
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 32)
    }
  });
};

const cosmeticCosts: Record<string, number> = {
  deck_neon: 1800,
  table_void: 4500
};

const tierFromPrice = (priceId: string): 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL' | null => {
  if (priceId === config.stripePriceSilver) return 'SILVER';
  if (priceId === config.stripePriceGold) return 'GOLD';
  if (priceId === config.stripePricePlatinum) return 'PLATINUM';
  if (priceId === config.stripePriceRoyal) return 'ROYAL';
  return null;
};

export const monetizationRoutes = new Hono();

monetizationRoutes.get('/catalog', (c) =>
  c.json({
    mockCheckout: config.mockCheckout,
    lobbyBannerUrl: lobbyHeroBanner,
    lobbyPreviewUrl: lobbyPreviewBanner,
    clubsBannerUrl: clubsHeroBanner,
    gameModes: catalogGameModes,
    subscriptions: [
      {
        tier: 'SILVER',
        priceUsd: 4.99,
        chipsBonusPct: 50,
        stripePriceId: config.stripePriceSilver || undefined,
        imageUrl: subscriptionBannerImages.SILVER
      },
      {
        tier: 'GOLD',
        priceUsd: 9.99,
        voiceChat: true,
        stripePriceId: config.stripePriceGold || undefined,
        imageUrl: subscriptionBannerImages.GOLD
      },
      {
        tier: 'PLATINUM',
        priceUsd: 19.99,
        coach: true,
        stripePriceId: config.stripePricePlatinum || undefined,
        imageUrl: subscriptionBannerImages.PLATINUM
      },
      {
        tier: 'ROYAL',
        priceUsd: 49.99,
        apiStats: true,
        stripePriceId: config.stripePriceRoyal || undefined,
        imageUrl: subscriptionBannerImages.ROYAL
      }
    ],
    chipPacks: [
      {
        id: 'chips_2500',
        chips: 2500,
        priceUsd: 2.99,
        imageUrl: chipPackImages.chips_2500
      },
      {
        id: 'chips_10000',
        chips: 10000,
        priceUsd: 9.99,
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
  })
);

monetizationRoutes.post('/stripe/webhook', async (c) => {
  if (!config.stripeSecretKey || !config.stripeWebhookSecret) {
    return c.text('Stripe not configured', 503);
  }
  const stripe = new Stripe(config.stripeSecretKey);
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.text('Missing signature', 400);

  const raw = await c.req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, config.stripeWebhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify failed';
    return c.text(`Webhook Error: ${message}`, 400);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? (session.metadata?.userId as string | undefined);
      if (userId && session.mode === 'subscription') {
        const full = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price']
        });
        const priceId = full.line_items?.data[0]?.price?.id ?? '';
        const tier = tierFromPrice(priceId);
        if (tier) {
          await activateSubscription(userId, tier);
        }
      } else if (userId && session.mode === 'payment') {
        const itemId = (session.metadata?.itemId as string | undefined) ?? 'chips_pack';
        await recordPurchase(userId, itemId, 'stripe', session.amount_total ?? 0, session.id);
      }
    }
  } catch (e) {
    console.error('Stripe handler', e);
    return c.json({ error: 'Handler failed' }, 500);
  }

  return c.json({ received: true });
});

monetizationRoutes.post('/yookassa/webhook', async (c) => {
  if (config.isProduction && !config.yookassaShopId) {
    return c.json({ error: 'YooKassa not configured' }, 503);
  }
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Invalid payload' }, 400);
  }
  try {
    const result = await handleYooKassaWebhook(body as Parameters<typeof handleYooKassaWebhook>[0]);
    return c.json({ received: true, ...result });
  } catch (e) {
    console.error('YooKassa webhook', e);
    return c.json({ error: 'Handler failed' }, 500);
  }
});

monetizationRoutes.use('*', authGuard);

monetizationRoutes.post('/shop/cosmetic', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const itemId = z.string().min(1).parse(body?.itemId);
  const cost = cosmeticCosts[itemId];
  if (!cost) return c.json({ error: 'Unknown cosmetic' }, 400);
  const uid = c.get('auth').userId;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.chips < cost) {
    return c.json({ error: 'Insufficient chips' }, 400);
  }
  const rarity = cost >= 8000 ? 'LEGENDARY' : cost >= 4000 ? 'EPIC' : 'RARE';
  await prisma.$transaction([
    prisma.user.update({ where: { id: uid }, data: { chips: { decrement: cost } } }),
    prisma.userItem.create({
      data: { userId: uid, itemId, rarity, equipped: false }
    })
  ]);
  return c.json({ ok: true, itemId });
});

monetizationRoutes.post('/checkout-session', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const uid = c.get('auth').userId;

  const mockTier = tierFromToken(parsed.data.priceId);
  if (allowDevMockCheckout()) {
    if (parsed.data.mode === 'subscription' && mockTier) {
      await activateSubscription(uid, mockTier);
      return c.json({ id: 'mock_checkout_session', activated: true, tier: mockTier });
    }
    return c.json({ error: 'Subscription tier not recognized for mock checkout' }, 400);
  }

  if (!config.stripeSecretKey) {
    return c.json({ error: 'Stripe not configured' }, 503);
  }
  const stripe = new Stripe(config.stripeSecretKey);
  const successUrl = `${config.publicWebUrl.replace(/\/$/, '')}/lobby?checkout=success`;
  const cancelUrl = `${config.publicWebUrl.replace(/\/$/, '')}/lobby?checkout=cancel`;
  const session = await stripe.checkout.sessions.create({
    mode: parsed.data.mode,
    client_reference_id: uid,
    metadata: { userId: uid, itemId: parsed.data.itemId ?? '' },
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl
  });
  return c.json({ id: session.id, url: session.url });
});

monetizationRoutes.post('/mock-subscribe', async (c) => {
  if (!allowDevMockCheckout()) {
    return c.json({ error: 'Use Stripe checkout in production' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = mockSubscribeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const uid = c.get('auth').userId;
  await activateSubscription(uid, parsed.data.tier);
  return c.json({ ok: true, tier: parsed.data.tier });
});

monetizationRoutes.post('/bonus', async (c) => {
  const uid = c.get('auth').userId;
  const result = await claimDailyBonus(uid, config.dailyBonusChips);
  if (!result.ok) {
    return c.json({ error: result.error }, 409);
  }
  return c.json({ ok: true, amount: result.amount });
});

monetizationRoutes.post('/purchase', async (c) => {
  if (!allowDevMockCheckout()) {
    return c.json({ error: 'Purchases must be confirmed via payment webhooks' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = purchaseSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  if (parsed.data.userId !== c.get('auth').userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await recordPurchase(
    parsed.data.userId,
    parsed.data.itemId,
    parsed.data.provider,
    parsed.data.amount,
    parsed.data.providerEventId
  );
  return c.json({ ok: true });
});
