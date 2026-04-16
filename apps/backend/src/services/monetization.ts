import { getMongoDb } from './mongo.js';
import { prisma } from './prisma.js';

export const creditDailyBonus = async (userId: string, amount: number) => {
  const db = getMongoDb();
  await prisma.user.update({
    where: { id: userId },
    data: { chips: { increment: amount } }
  });
  await db.collection('chip_ledger').insertOne({
    userId,
    amount,
    direction: 'CREDIT',
    reason: 'daily_bonus',
    createdAt: new Date()
  });
};

export const recordPurchase = async (
  userId: string,
  itemId: string,
  provider: 'stripe' | 'apple_iap' | 'google_play',
  amount: number,
  providerEventId: string
) => {
  const db = getMongoDb();
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
  await prisma.userItem.create({
    data: {
      userId,
      itemId,
      rarity: 'COMMON',
      equipped: false
    }
  });
  await db.collection('transactions').insertOne({
    userId,
    itemId,
    provider,
    amount,
    providerEventId,
    disclaimer: 'Virtual chips and items are non-refundable and non-withdrawable.',
    createdAt: new Date()
  });
};
