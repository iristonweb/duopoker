import { allCosmetics, TIER_RANK } from '@duopoker/shared-types';
import type { PaidSubscriptionTier } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { getEffectiveOrganizerTier, PLAN_LIMITS } from './club-plans.js';
import { pickHighestTier } from './subscription-tier.js';

type PaidTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'BLACK';

export const LIFETIME_EXPIRES = new Date('2099-12-31T23:59:59.999Z');

export const grantSubscription = async (
  userId: string,
  tier: PaidTier,
  lifetime = false,
  days = 32
) => {
  const subId = `${userId}-${tier}`;
  const expiresAt = lifetime
    ? LIFETIME_EXPIRES
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * days);
  await prisma.subscription.upsert({
    where: { id: subId },
    create: {
      id: subId,
      userId,
      tier,
      status: 'ACTIVE',
      expiresAt
    },
    update: {
      tier,
      status: 'ACTIVE',
      expiresAt
    }
  });
};

export const grantCosmeticItems = async (userId: string, itemIds: string[]) => {
  const defs = itemIds
    .map((id) => allCosmetics.find((c) => c.id === id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  if (!defs.length) return [];

  const existing = await prisma.userItem.findMany({
    where: { userId, itemId: { in: defs.map((d) => d.id) } },
    select: { itemId: true }
  });
  const owned = new Set(existing.map((row) => row.itemId));
  const missing = defs.filter((d) => !owned.has(d.id));
  if (missing.length) {
    await prisma.userItem.createMany({
      data: missing.map((d) => ({
        userId,
        itemId: d.id,
        rarity: d.rarity,
        equipped: false
      })),
      skipDuplicates: true
    });
  }
  return defs.map((d) => d.id);
};

export const grantAllCosmetics = async (userId: string) =>
  grantCosmeticItems(
    userId,
    allCosmetics.map((c) => c.id)
  );

export const grantTierCosmetics = async (userId: string, tier: PaidSubscriptionTier) =>
  grantCosmeticItems(
    userId,
    allCosmetics.filter((c) => TIER_RANK[c.requiredTier] <= TIER_RANK[tier]).map((c) => c.id)
  );

export const revokeUserSubscriptions = async (userId: string) => {
  await prisma.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' }
  });
};

export const grantFounderPackage = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  });
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

  await grantSubscription(user.id, 'BLACK', true);
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
  clubsOwned: Array<{
    id: string;
    name: string;
    organizerTier: string;
    members: number;
    activeTables: number;
    limits: { maxMembers: number; maxActiveTables: number };
  }>;
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
        select: { tier: true, expiresAt: true, status: true }
      },
      inventory: { select: { itemId: true, equipped: true, rarity: true } },
      _count: { select: { clubMemberships: true } },
      clubsOwned: {
        select: {
          id: true,
          name: true,
          organizerPlan: { select: { tier: true, status: true, expiresAt: true } },
          _count: { select: { members: true, privateTables: true } },
          privateTables: {
            where: { status: { in: ['SCHEDULED', 'LIVE'] } },
            select: { id: true }
          }
        }
      }
    }
  });
  if (!user) return null;

  const [handsPlayed, queueTicket, assignment] = await Promise.all([
    prisma.hand.count({ where: { winnerId: userId } }),
    prisma.matchmakingTicket.findUnique({ where: { userId } }),
    prisma.matchAssignment.findUnique({ where: { userId } })
  ]);

  const { subscriptions, inventory, _count, clubsOwned, ...profile } = user;
  const effectiveTier = pickHighestTier(subscriptions);
  const topSub = subscriptions.find((s) => s.tier === effectiveTier) ?? subscriptions[0] ?? null;

  return {
    ...profile,
    subscription: topSub,
    inventory,
    stats: {
      handsPlayed,
      inQueue: Boolean(queueTicket),
      matchAssignment: assignment?.sessionId ?? null,
      clubMemberships: _count.clubMemberships
    },
    clubsOwned: clubsOwned.map((club) => {
      const organizerTier = getEffectiveOrganizerTier(club.organizerPlan);
      const limits = PLAN_LIMITS[organizerTier];
      return {
        id: club.id,
        name: club.name,
        organizerTier,
        members: club._count.members,
        activeTables: club.privateTables.length,
        limits
      };
    })
  };
};
