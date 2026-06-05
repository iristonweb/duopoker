import { prisma } from '../lib/prisma.js';

export const creditDailyBonus = async (userId: string, amount: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { chips: { increment: amount } }
  });
};

const CHIP_PACKS: Record<string, number> = {
  chips_2500: 2500,
  chips_10000: 10000
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
