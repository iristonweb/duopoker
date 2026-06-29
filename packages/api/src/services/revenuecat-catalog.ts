import type { PaidSubscriptionTier } from './monetization.js';

export type RevenueCatStore = 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | string;

export type RevenueCatProductMapping = {
  itemId?: string;
  tier?: PaidSubscriptionTier;
};

/** RevenueCat / store product identifiers → DuoPoker catalog. */
export const REVENUECAT_PRODUCT_MAP: Record<string, RevenueCatProductMapping> = {
  'duopoker.chips.2500': { itemId: 'chips_2500' },
  'duopoker.chips.10000': { itemId: 'chips_10000' },
  'duopoker.tier.bronze': { tier: 'BRONZE' },
  'duopoker.tier.silver': { tier: 'SILVER' },
  'duopoker.tier.gold': { tier: 'GOLD' },
  'duopoker.tier.platinum': { tier: 'PLATINUM' },
  'duopoker.tier.diamond': { tier: 'DIAMOND' },
  'duopoker.tier.black': { tier: 'BLACK' }
};

export const resolveRevenueCatProduct = (productId: string): RevenueCatProductMapping | null =>
  REVENUECAT_PRODUCT_MAP[productId] ?? null;

export const revenueCatProviderForStore = (
  store: RevenueCatStore
): 'apple_iap' | 'google_play' => (store === 'PLAY_STORE' ? 'google_play' : 'apple_iap');

export const revenueCatEventClaimId = (eventId: string): string => `revenuecat:event:${eventId}`;
