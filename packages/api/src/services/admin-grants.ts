import { allCosmetics } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';

type PaidTier = 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';

export const LIFETIME_EXPIRES = new Date('2099-12-31T23:59:59.999Z');

export const grantSubscription = async (
  userId: string,
  tier: PaidTier,
  lifetime = false
) => {
  const subId = `${userId}-${tier}`;
  await prisma.subscription.upsert({
    where: { id: subId },
    create: {
      id: subId,
      userId,
      tier,
      status: 'ACTIVE',
      expiresAt: lifetime ? LIFETIME_EXPIRES : new Date(Date.now() + 1000 * 60 * 60 * 24 * 32)
    },
    update: {
      tier,
      status: 'ACTIVE',
      expiresAt: lifetime ? LIFETIME_EXPIRES : new Date(Date.now() + 1000 * 60 * 60 * 24 * 32)
    }
  });
};

export const grantCosmeticItems = async (userId: string, itemIds: string[]) => {
  const defs = itemIds
    .map((id) => allCosmetics.find((c) => c.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));

  for (const def of defs) {
    const existing = await prisma.userItem.findFirst({
      where: { userId, itemId: def.id }
    });
    if (!existing) {
      await prisma.userItem.create({
        data: { userId, itemId: def.id, rarity: def.rarity, equipped: false }
      });
    }
  }
  return defs.map((d) => d.id);
};

export const grantAllCosmetics = async (userId: string) =>
  grantCosmeticItems(
    userId,
    allCosmetics.map((c) => c.id)
  );

export const grantFounderPackage = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { ok: false as const, error: 'USER_NOT_FOUND' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'SUPERADMIN',
      emailVerified: true,
      chips: Math.max(user.chips, 999_999)
    }
  });

  await grantSubscription(user.id, 'ROYAL', true);
  const items = await grantAllCosmetics(user.id);

  return {
    ok: true as const,
    userId: user.id,
    email: user.email,
    nickname: user.nickname,
    itemsGranted: items.length
  };
};

export type AdminUserDetail = {
  id: string;
  email: string;
  displayName: string;
  nickname: string;
  role: string;
  chips: number;
  level: number;
  xp: number;
  emailVerified: boolean;
  createdAt: Date;
  subscription: { tier: string; expiresAt: Date; status: string } | null;
  inventory: { itemId: string; equipped: boolean; rarity: string }[];
  stats: {
    handsPlayed: number;
    inQueue: boolean;
    matchAssignment: string | null;
    clubMemberships: number;
  };
};

export const getAdminUserDetail = async (userId: string): Promise<AdminUserDetail | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      nickname: true,
      role: true,
      chips: true,
      level: true,
      xp: true,
      emailVerified: true,
      createdAt: true,
      subscriptions: {
        where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: 'desc' },
        take: 1,
        select: { tier: true, expiresAt: true, status: true }
      },
      inventory: { select: { itemId: true, equipped: true, rarity: true } },
      _count: { select: { clubMemberships: true } }
    }
  });
  if (!user) return null;

  const [handsPlayed, queueTicket, assignment] = await Promise.all([
    prisma.hand.count({ where: { winnerId: userId } }),
    prisma.matchmakingTicket.findUnique({ where: { userId } }),
    prisma.matchAssignment.findUnique({ where: { userId } })
  ]);

  const { subscriptions, inventory, _count, ...profile } = user;
  return {
    ...profile,
    subscription: subscriptions[0] ?? null,
    inventory,
    stats: {
      handsPlayed,
      inQueue: Boolean(queueTicket),
      matchAssignment: assignment?.sessionId ?? null,
      clubMemberships: _count.clubMemberships
    }
  };
};
