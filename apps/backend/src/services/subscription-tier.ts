import { TIER_RANK, type SubscriptionTier } from '@duopoker/shared-types';
import { prisma } from './prisma.js';

const BOT_PREFIX = 'duopoker-bot';

export const pickHighestTier = (tiers: Array<{ tier: string }>): SubscriptionTier => {
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
  if (userId.startsWith(BOT_PREFIX)) return 'FREE';
  const subs = await prisma.subscription.findMany({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    select: { tier: true }
  });
  return pickHighestTier(subs);
};

export const getUserSubscriptionTier = async (userId: string): Promise<SubscriptionTier> => {
  if (userId.startsWith(BOT_PREFIX)) return 'FREE';
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { tier: true }
  });
  return (sub?.tier as SubscriptionTier | undefined) ?? 'FREE';
};

export const getSubscriptionTiersBatch = async (
  userIds: string[]
): Promise<Map<string, SubscriptionTier>> => {
  const unique = [...new Set(userIds.filter((id) => id && !id.startsWith(BOT_PREFIX)))];
  const map = new Map<string, SubscriptionTier>();
  for (const id of userIds) {
    if (id.startsWith(BOT_PREFIX)) map.set(id, 'FREE');
  }
  if (!unique.length) return map;

  const subs = await prisma.subscription.findMany({
    where: {
      userId: { in: unique },
      status: 'ACTIVE',
      expiresAt: { gt: new Date() }
    },
    orderBy: { expiresAt: 'desc' },
    select: { userId: true, tier: true }
  });
  for (const id of unique) map.set(id, 'FREE');
  for (const sub of subs) {
    if (!map.has(sub.userId) || map.get(sub.userId) === 'FREE') {
      map.set(sub.userId, sub.tier as SubscriptionTier);
    }
  }
  return map;
};
