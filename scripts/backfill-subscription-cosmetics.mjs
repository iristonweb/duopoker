/**
 * Grant missing subscription cosmetics to users with active paid subscriptions.
 * Run after activateSubscription started calling grantTierCosmetics.
 *
 * Usage:
 *   pnpm backfill:cosmetics           # apply
 *   pnpm backfill:cosmetics -- --dry-run
 */
import { allCosmetics, TIER_RANK } from '../packages/shared-types/dist/cosmetics.js';
import { closeScriptPrisma, createScriptPrisma } from './create-script-prisma.mjs';

const dryRun = process.argv.includes('--dry-run');
const ctx = await createScriptPrisma();
const { prisma } = ctx;

const pickHighestTier = (tiers) => {
  let best = 'FREE';
  let bestRank = TIER_RANK.FREE;
  for (const tier of tiers) {
    const rank = TIER_RANK[tier] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = tier;
    }
  }
  return best;
};

const cosmeticsForTier = (tier) =>
  allCosmetics.filter((c) => TIER_RANK[c.requiredTier] <= TIER_RANK[tier]);

try {
  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
    select: { userId: true, tier: true }
  });

  const tiersByUser = new Map();
  for (const row of activeSubs) {
    const list = tiersByUser.get(row.userId) ?? [];
    list.push(row.tier);
    tiersByUser.set(row.userId, list);
  }

  let usersProcessed = 0;
  let itemsCreated = 0;

  for (const [userId, tiers] of tiersByUser) {
    const tier = pickHighestTier(tiers);
    if (tier === 'FREE') continue;

    const eligible = cosmeticsForTier(tier);
    const existing = await prisma.userItem.findMany({
      where: { userId, itemId: { in: eligible.map((c) => c.id) } },
      select: { itemId: true }
    });
    const owned = new Set(existing.map((row) => row.itemId));
    const missing = eligible.filter((c) => !owned.has(c.id));
    if (!missing.length) continue;

    usersProcessed += 1;
    itemsCreated += missing.length;

    if (dryRun) {
      console.log(`[dry-run] ${userId} (${tier}): +${missing.length} items`);
      continue;
    }

    await prisma.userItem.createMany({
      data: missing.map((c) => ({
        userId,
        itemId: c.id,
        rarity: c.rarity,
        equipped: false
      })),
      skipDuplicates: true
    });
    console.log(`${userId} (${tier}): granted ${missing.length} cosmetics`);
  }

  console.log(
    dryRun
      ? `[dry-run] Would update ${usersProcessed} users, ${itemsCreated} items total`
      : `Done: ${usersProcessed} users, ${itemsCreated} items granted`
  );
} finally {
  await closeScriptPrisma(ctx);
}
