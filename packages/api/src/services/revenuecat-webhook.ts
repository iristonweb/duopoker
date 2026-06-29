import {
  activateSubscription,
  recordPurchase,
  type PaidSubscriptionTier
} from './monetization.js';
import { claimWebhookEvent } from './webhook-dedup.js';
import {
  resolveRevenueCatProduct,
  revenueCatEventClaimId,
  revenueCatProviderForStore,
  type RevenueCatStore
} from './revenuecat-catalog.js';
import { prisma } from '../lib/prisma.js';

export type RevenueCatWebhookEvent = {
  id: string;
  type: string;
  app_user_id: string;
  product_id?: string;
  store?: RevenueCatStore;
  price_in_purchased_currency?: number;
};

export type RevenueCatWebhookPayload = {
  api_version?: string;
  event: RevenueCatWebhookEvent;
};

const PURCHASE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE'
]);

const EXPIRY_EVENTS = new Set(['CANCELLATION', 'EXPIRATION']);

export const handleRevenueCatWebhook = async (
  payload: RevenueCatWebhookPayload
): Promise<Record<string, unknown>> => {
  const event = payload.event;
  const userId = event.app_user_id;
  if (!userId || !event.id) {
    return { received: true, skipped: 'invalid_event' };
  }

  const productId = event.product_id ?? '';
  const mapping = productId ? resolveRevenueCatProduct(productId) : null;
  const provider = revenueCatProviderForStore(event.store ?? 'APP_STORE');
  const providerUpper = provider === 'google_play' ? 'GOOGLE_PLAY' : 'APPLE_IAP';

  if (PURCHASE_EVENTS.has(event.type)) {
    if (!mapping) {
      return { received: true, skipped: 'unknown_product', productId };
    }

    const claimed = await claimWebhookEvent(providerUpper, revenueCatEventClaimId(event.id), userId, {
      revenueCatType: event.type,
      productId
    });
    if (!claimed) {
      return { received: true, duplicate: true };
    }

    if (mapping.tier) {
      await activateSubscription(userId, mapping.tier as PaidSubscriptionTier);
      return { received: true, activated: mapping.tier };
    }
    if (mapping.itemId) {
      await recordPurchase(
        userId,
        mapping.itemId,
        provider,
        Math.round(event.price_in_purchased_currency ?? 0),
        `rc:purchase:${event.id}`
      );
      return { received: true, granted: mapping.itemId };
    }
  }

  if (EXPIRY_EVENTS.has(event.type) && mapping?.tier) {
    await prisma.subscription.updateMany({
      where: { userId, tier: mapping.tier },
      data: { status: 'CANCELLED', expiresAt: new Date() }
    });
    return { received: true, cancelled: mapping.tier };
  }

  return { received: true, ignored: event.type };
};
