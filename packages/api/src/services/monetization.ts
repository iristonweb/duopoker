import { TIER_RANK } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { resolveUserSubscriptionTier } from './subscription-tier.js';

const DAILY_BONUS_PROVIDER = 'STRIPE' as const;

export type PaidSubscriptionTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'BLACK';

export const activateSubscription = async (userId: string, tier: PaidSubscriptionTier) => {
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

/** Base daily bonus; SILVER+ gets +50% per catalog perk. */
export const resolveDailyBonusAmount = async (userId: string, baseAmount: number): Promise<number> => {
  const tier = await resolveUserSubscriptionTier(userId);
  if (TIER_RANK[tier] >= TIER_RANK.SILVER) {
    return Math.round(baseAmount * 1.5);
  }
  return baseAmount;
};

export const claimDailyBonus = async (
  userId: string,
  amount: number
): Promise<{ ok: true; amount: number } | { ok: false; error: string }> => {
  const dayKey = new Date().toISOString().slice(0, 10);
  const providerEventId = `daily_bonus:${userId}:${dayKey}`;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentEvent.create({
        data: {
          userId,
          provider: DAILY_BONUS_PROVIDER,
          providerEventId,
          amount: 0,
          status: 'SUCCEEDED',
          metadata: { type: 'daily_bonus', chips: amount, day: dayKey }
        }
      });
      await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: amount } }
      });
    });
    return { ok: true, amount };
  } catch {
    return { ok: false, error: 'ALREADY_CLAIMED' };
  }
};

export const recordPurchase = async (
  userId: string,
  itemId: string,
  provider: 'stripe' | 'apple_iap' | 'google_play',
  amount: number,
  providerEventId: string
) => {
  await prisma.paymentEvent.upsert({
    where: { providerEventId },
    update: { status: 'SUCCEEDED' },
    create: {
      userId,
      provider: provider.toUpperCase() as 'STRIPE' | 'APPLE_IAP' | 'GOOGLE_PLAY',
      providerEventId,
      amount,
      status: 'SUCCEEDED',
      metadata: { itemId }
    }
  });
  const CHIP_PACKS: Record<string, number> = {
    chips_2500: 2500,
    chips_10000: 10000
  };
  const chipGrant = CHIP_PACKS[itemId];
  if (chipGrant) {
    await prisma.user.update({
      where: { id: userId },
      data: { chips: { increment: chipGrant } }
    });
  } else {
    await prisma.userItem.create({
      data: {
        userId,
        itemId,
        rarity: 'COMMON',
        equipped: false
      }
    });
  }
};
