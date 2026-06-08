import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../config.js';
import { recordPurchase } from '../services/monetization.js';
import { prisma } from '../services/prisma.js';

const claimStripeEvent = async (eventId: string, userId: string) => {
  try {
    await prisma.paymentEvent.create({
      data: {
        userId,
        provider: 'STRIPE',
        providerEventId: `stripe:event:${eventId}`,
        amount: 0,
        status: 'SUCCEEDED',
        metadata: { type: 'webhook_claim' }
      }
    });
    return true;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'P2002') return false;
    throw err;
  }
};

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;

const tierFromPrice = (
  priceId: string
): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'BLACK' | null => {
  if (priceId && priceId === process.env.STRIPE_PRICE_BRONZE) return 'BRONZE';
  if (priceId && priceId === process.env.STRIPE_PRICE_SILVER) return 'SILVER';
  if (priceId && priceId === process.env.STRIPE_PRICE_GOLD) return 'GOLD';
  if (priceId && priceId === process.env.STRIPE_PRICE_PLATINUM) return 'PLATINUM';
  if (priceId && priceId === process.env.STRIPE_PRICE_DIAMOND) return 'DIAMOND';
  if (priceId && priceId === process.env.STRIPE_PRICE_BLACK) return 'BLACK';
  return null;
};

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  if (!stripe || !config.stripeWebhookSecret) {
    return res.status(503).send('Stripe not configured');
  }
  const sig = req.headers['stripe-signature'];
  if (typeof sig !== 'string') return res.status(400).send('Missing signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, config.stripeWebhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify failed';
    return res.status(400).send(`Webhook Error: ${message}`);
  }

  try {
    const claimUserId =
      (event.data.object as { client_reference_id?: string }).client_reference_id ??
      (event.data.object as { metadata?: { userId?: string } }).metadata?.userId ??
      'stripe-webhook';

    if (!(await claimStripeEvent(event.id, claimUserId))) {
      return res.json({ received: true, duplicate: true });
    }

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
        }
      } else if (userId && session.mode === 'payment') {
        const itemId = (session.metadata?.itemId as string | undefined) ?? 'chips_pack';
        await recordPurchase(
          userId,
          itemId,
          'stripe',
          session.amount_total ?? 0,
          session.id
        );
      }
    }
  } catch (e) {
    console.error('Stripe handler', e);
    return res.status(500).json({ error: 'Handler failed' });
  }

  return res.json({ received: true });
};
