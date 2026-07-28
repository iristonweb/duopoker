import { getMongoDb, isMongoReady } from './mongo.js';
import { prisma } from './prisma.js';

export const creditDailyBonus = async (
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
          provider: 'STRIPE',
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
  } catch {
    return { ok: false, error: 'ALREADY_CLAIMED' };
  }

  if (isMongoReady()) {
    try {
      await getMongoDb().collection('chip_ledger').insertOne({
        userId,
        amount,
        direction: 'CREDIT',
        reason: 'daily_bonus',
        createdAt: new Date()
      });
    } catch {
      /* ledger optional when Mongo degraded */
    }
  }
  return { ok: true, amount };
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
  if (isMongoReady()) {
    try {
      await getMongoDb().collection('transactions').insertOne({
        userId,
        itemId,
        provider,
        amount,
        providerEventId,
        disclaimer:
          'Virtual chips and items are non-refundable and non-withdrawable. DuoPoker does not facilitate cashout or player-to-player money transfers.',
        createdAt: new Date()
      });
    } catch {
      /* mirror log optional */
    }
  }
};
