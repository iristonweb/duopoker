import {
  resolveEquipped,
  TIER_RANK,
  type EquippedCosmetics,
  type SubscriptionTier
} from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { decryptField } from '../lib/field-crypto.js';
import { BOT_PREFIX } from './game-session.js';
import { resolveUserSubscriptionTier } from './subscription-tier.js';

export const getUserSubscriptionTier = async (userId: string): Promise<SubscriptionTier> => {
  if (userId.startsWith(BOT_PREFIX)) return 'FREE';
  return resolveUserSubscriptionTier(userId);
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
    select: { userId: true, tier: true }
  });
  for (const id of unique) map.set(id, 'FREE');
  const byUser = new Map<string, Array<{ tier: string }>>();
  for (const sub of subs) {
    const list = byUser.get(sub.userId) ?? [];
    list.push({ tier: sub.tier });
    byUser.set(sub.userId, list);
  }
  for (const [userId, rows] of byUser) {
    let best: SubscriptionTier = 'FREE';
    let bestRank = TIER_RANK.FREE;
    for (const row of rows) {
      const tier = row.tier as SubscriptionTier;
      const rank = TIER_RANK[tier] ?? 0;
      if (rank > bestRank) {
        bestRank = rank;
        best = tier;
      }
    }
    map.set(userId, best);
  }
  return map;
};

export const getPrivateTableBySessionId = async (sessionId: string) =>
  prisma.privateTable.findUnique({
    where: { sessionId },
    include: { club: { select: { id: true, isArchived: true } } }
  });

export const canJoinPrivateSession = async (
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  if (userId.startsWith('guest-')) {
    return { ok: false, reason: 'GUEST_NOT_ALLOWED' };
  }

  const table = await getPrivateTableBySessionId(sessionId);
  if (!table) return { ok: true };

  if (table.club.isArchived || table.status === 'CLOSED') {
    return { ok: false, reason: 'TABLE_CLOSED' };
  }

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId: table.clubId, userId } }
  });
  if (!membership) {
    return { ok: false, reason: 'CLUB_MEMBERSHIP_REQUIRED' };
  }

  const isAdmin =
    membership.role === 'OWNER' || membership.role === 'ADMIN' || table.hostUserId === userId;

  const seat = await prisma.privateTableSeat.findUnique({
    where: { tableId_userId: { tableId: table.id, userId } }
  });

  if (isAdmin) return { ok: true };
  if (!seat || (seat.status !== 'ACCEPTED' && seat.status !== 'SEATED')) {
    return { ok: false, reason: 'INVITE_REQUIRED' };
  }

  return { ok: true };
};

export type SessionPlayerProfile = {
  userId: string;
  nickname: string | null;
  displayName: string;
  avatar: string | null;
  tableStatus: string | null;
  subscriptionTier: SubscriptionTier;
  equipped: EquippedCosmetics;
};

export const getSessionPlayerProfiles = async (userIds: string[]): Promise<SessionPlayerProfile[]> => {
  if (!userIds.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      nickname: true,
      displayName: true,
      avatar: true,
      tableStatus: true,
      subscriptions: {
        where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: 'desc' },
        take: 1,
        select: { tier: true }
      },
      inventory: {
        where: { equipped: true },
        select: { itemId: true }
      }
    }
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return userIds.map((id) => {
    if (id.startsWith(BOT_PREFIX)) {
      const botIndex = (() => {
        const suffix = id.split('-').pop();
        return suffix && /^\d+$/.test(suffix) ? Number(suffix) + 1 : 1;
      })();
      return {
        userId: id,
        nickname: `bot${botIndex}`,
        displayName: botIndex > 1 ? `DuoBot ${botIndex}` : 'DuoBot',
        avatar: null,
        tableStatus: null,
        subscriptionTier: 'FREE' as SubscriptionTier,
        equipped: resolveEquipped({}, 'FREE', [])
      };
    }
    const u = byId.get(id);
    const tier: SubscriptionTier = (u?.subscriptions[0]?.tier as SubscriptionTier | undefined) ?? 'FREE';
    const inventoryIds = u?.inventory.map((i) => i.itemId) ?? [];
    const equippedFromDb: Partial<EquippedCosmetics> = {};
    for (const itemId of inventoryIds) {
      if (itemId.startsWith('deck_')) equippedFromDb.deck = itemId;
      if (itemId.startsWith('chip_') || itemId === 'table_void') equippedFromDb.chip = itemId;
      if (itemId.startsWith('frame_')) equippedFromDb.frame = itemId;
      if (itemId.startsWith('title_')) equippedFromDb.title = itemId;
    }
    return {
      userId: id,
      nickname: u?.nickname ?? null,
      displayName: u?.displayName ?? id.slice(0, 8),
      avatar: decryptField(u?.avatar ?? null),
      tableStatus: decryptField(u?.tableStatus ?? null),
      subscriptionTier: tier,
      equipped: resolveEquipped(equippedFromDb, tier, inventoryIds)
    };
  });
};
