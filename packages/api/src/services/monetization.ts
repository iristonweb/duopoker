import { prisma } from '../lib/prisma.js';

const DAILY_BONUS_PROVIDER = 'STRIPE' as const;

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
