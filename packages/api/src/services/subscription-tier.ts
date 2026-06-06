import { TIER_RANK, type SubscriptionTier } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';

export const pickHighestTier = (
  tiers: Array<{ tier: string }>
): SubscriptionTier => {
  let best: SubscriptionTier = 'FREE';
  let bestRank = TIER_RANK.FREE;
  for (const row of tiers) {
    const tier = row.tier as SubscriptionTier;
    const rank = TIER_RANK[tier] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = tier;
    }
  }
  return best;
};

export const resolveUserSubscriptionTier = async (userId: string): Promise<SubscriptionTier> => {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    select: { tier: true }
  });
  return pickHighestTier(subs);
};
