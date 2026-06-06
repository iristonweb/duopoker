import { subscriptionCosmetics, TIER_RANK, tierMeetsRequirement, type SubscriptionTier } from './cosmetics';
import type { PaidSubscriptionTier } from './pricing';

export type SubscriptionPerkId =
  | 'ghostBoard'
  | 'privateTables'
  | 'chipsBonus50'
  | 'voiceChat'
  | 'coach'
  | 'rareCosmetics'
  | 'apiStats';

export const SUBSCRIPTION_PERK_MIN_TIER: Record<SubscriptionPerkId, SubscriptionTier> = {
  ghostBoard: 'BRONZE',
  privateTables: 'BRONZE',
  chipsBonus50: 'SILVER',
  voiceChat: 'GOLD',
  coach: 'PLATINUM',
  rareCosmetics: 'DIAMOND',
  apiStats: 'BLACK'
};

export const PAID_SUBSCRIPTION_TIERS: PaidSubscriptionTier[] = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'BLACK'
];

export const tierHasPerk = (userTier: SubscriptionTier, perk: SubscriptionPerkId): boolean =>
  TIER_RANK[userTier] >= TIER_RANK[SUBSCRIPTION_PERK_MIN_TIER[perk]];

export const perksUnlockedAtTier = (tier: SubscriptionTier): SubscriptionPerkId[] =>
  (Object.keys(SUBSCRIPTION_PERK_MIN_TIER) as SubscriptionPerkId[]).filter((perk) =>
    tierHasPerk(tier, perk)
  );

/** Subscription cosmetics unlocked cumulatively up to tier (excludes chip-shop extras). */
export const subscriptionCosmeticsUpToTier = (tier: SubscriptionTier) =>
  subscriptionCosmetics.filter((c) => tierMeetsRequirement(tier, c.requiredTier));

export const paidCosmeticSetsUpToTier = (tier: PaidSubscriptionTier): number => {
  const idx = PAID_SUBSCRIPTION_TIERS.indexOf(tier);
  return idx + 1;
};
