import {
  allCosmetics,
  REFERRAL_ACTIVE_MIN_AGE_MS,
  REFERRAL_ACTIVE_MIN_HANDS,
  REFERRAL_CODE_WINDOW_DAYS,
  REFERRAL_MILESTONES,
  TIER_RANK,
  referralMilestoneByLevel,
  type PaidSubscriptionTier,
  type ReferralMilestone
} from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { BOT_PREFIX } from './game-session.js';

const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const randomSuffix = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export const ensureReferralCode = async (userId: string, nickname?: string) => {
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) return existing;

  const base = (nickname ?? 'DUO').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'DUO';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = attempt === 0 ? base : `${base.slice(0, 6)}${randomSuffix()}`;
    try {
      return await prisma.referralCode.create({
        data: { userId, code }
      });
    } catch {
      /* unique collision */
    }
  }
  return prisma.referralCode.create({
    data: { userId, code: `REF${randomSuffix()}${randomSuffix()}` }
  });
};

export const attachReferralOnSignup = async (referredUserId: string, rawCode?: string) => {
  const code = rawCode ? normalizeCode(rawCode) : '';
  if (!code) return { ok: false as const, error: 'NO_CODE' };

  const referralCode = await prisma.referralCode.findUnique({ where: { code } });
  if (!referralCode) return { ok: false as const, error: 'INVALID_CODE' };
  if (referralCode.userId === referredUserId) return { ok: false as const, error: 'SELF_REFERRAL' };

  const existing = await prisma.referral.findUnique({ where: { referredId: referredUserId } });
  if (existing) return { ok: false as const, error: 'ALREADY_REFERRED' };

  await prisma.referral.create({
    data: {
      referrerId: referralCode.userId,
      referredId: referredUserId,
      code: referralCode.code
    }
  });
  return { ok: true as const, referrerId: referralCode.userId };
};

export const applyReferralCode = async (userId: string, rawCode: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true }
  });
  if (!user) return { ok: false as const, error: 'USER_NOT_FOUND' };

  const windowMs = REFERRAL_CODE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() - user.createdAt.getTime() > windowMs) {
    return { ok: false as const, error: 'WINDOW_EXPIRED' };
  }

  return attachReferralOnSignup(userId, rawCode);
};

const cosmeticsUpToTier = (tier: PaidSubscriptionTier) =>
  allCosmetics
    .filter((c) => TIER_RANK[c.requiredTier] <= TIER_RANK[tier])
    .map((c) => c.id);

/** Re-check pending referral after email verification (hands/age may already be satisfied). */
export const activatePendingReferralsForUser = async (userId: string) => {
  const ref = await prisma.referral.findUnique({
    where: { referredId: userId },
    include: { referred: { select: { emailVerified: true, createdAt: true } } }
  });
  if (!ref || ref.status !== 'PENDING') return;

  const ageOk = Date.now() - ref.referred.createdAt.getTime() >= REFERRAL_ACTIVE_MIN_AGE_MS;
  const handsOk = ref.handsPlayed >= REFERRAL_ACTIVE_MIN_HANDS;
  if (ageOk && handsOk && ref.referred.emailVerified) {
    await prisma.referral.update({
      where: { id: ref.id },
      data: { status: 'ACTIVE', activatedAt: new Date() }
    });
  }
};

export const recordReferralHands = async (playerIds: string[]) => {
  const humans = playerIds.filter((id) => id && !id.startsWith(BOT_PREFIX) && !id.startsWith('guest-'));
  if (!humans.length) return;

  const referrals = await prisma.referral.findMany({
    where: { referredId: { in: humans }, status: 'PENDING' }
  });
  if (!referrals.length) return;

  for (const ref of referrals) {
    const updated = await prisma.referral.update({
      where: { id: ref.id },
      data: { handsPlayed: { increment: 1 } },
      include: { referred: { select: { emailVerified: true, createdAt: true } } }
    });
    const ageOk = Date.now() - updated.referred.createdAt.getTime() >= REFERRAL_ACTIVE_MIN_AGE_MS;
    const handsOk = updated.handsPlayed >= REFERRAL_ACTIVE_MIN_HANDS;
    if (ageOk && handsOk && updated.referred.emailVerified) {
      await prisma.referral.update({
        where: { id: ref.id },
        data: { status: 'ACTIVE', activatedAt: new Date() }
      });
    }
  }
};

export const getReferralDashboard = async (userId: string) => {
  const codeRow = await ensureReferralCode(
    userId,
    (await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }))?.nickname
  );

  const [pending, active, claims, referredBy] = await Promise.all([
    prisma.referral.count({ where: { referrerId: userId, status: 'PENDING' } }),
    prisma.referral.count({ where: { referrerId: userId, status: 'ACTIVE' } }),
    prisma.referralRewardClaim.findMany({
      where: { userId },
      orderBy: { level: 'asc' },
      select: { level: true, chips: true, claimedAt: true }
    }),
    prisma.referral.findUnique({
      where: { referredId: userId },
      select: { code: true, status: true, registeredAt: true, activatedAt: true }
    })
  ]);

  const milestones = REFERRAL_MILESTONES.map((m) => ({
    ...m,
    claimed: claims.some((c) => c.level === m.level),
    claimable: active >= m.activeReferralsRequired && !claims.some((c) => c.level === m.level)
  }));

  return {
    code: codeRow.code,
    pendingReferrals: pending,
    activeReferrals: active,
    totalReferrals: pending + active,
    referredBy,
    milestones,
    claims
  };
};

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const applyMilestoneRewardsInTx = async (tx: Tx, userId: string, milestone: ReferralMilestone) => {
  if (milestone.chips > 0) {
    await tx.user.update({
      where: { id: userId },
      data: { chips: { increment: milestone.chips } }
    });
  }
  if (milestone.cosmeticsTier) {
    const itemIds = cosmeticsUpToTier(milestone.cosmeticsTier);
    const defs = itemIds
      .map((id) => allCosmetics.find((c) => c.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
    if (defs.length) {
      const existing = await tx.userItem.findMany({
        where: { userId, itemId: { in: defs.map((d) => d.id) } },
        select: { itemId: true }
      });
      const owned = new Set(existing.map((row) => row.itemId));
      const missing = defs.filter((d) => !owned.has(d.id));
      if (missing.length) {
        await tx.userItem.createMany({
          data: missing.map((d) => ({
            userId,
            itemId: d.id,
            rarity: d.rarity,
            equipped: false
          })),
          skipDuplicates: true
        });
      }
    }
  }
  if (milestone.subscriptionTier) {
    const subId = `${userId}-${milestone.subscriptionTier}`;
    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * (milestone.subscriptionDays ?? 30)
    );
    await tx.subscription.upsert({
      where: { id: subId },
      create: {
        id: subId,
        userId,
        tier: milestone.subscriptionTier,
        status: 'ACTIVE',
        expiresAt
      },
      update: {
        tier: milestone.subscriptionTier,
        status: 'ACTIVE',
        expiresAt
      }
    });
  }
};

export const claimReferralMilestone = async (userId: string, level: number) => {
  const milestone = referralMilestoneByLevel(level);
  if (!milestone) return { ok: false as const, error: 'INVALID_LEVEL' };

  const active = await prisma.referral.count({
    where: { referrerId: userId, status: 'ACTIVE' }
  });
  if (active < milestone.activeReferralsRequired) {
    return { ok: false as const, error: 'NOT_ENOUGH_ACTIVE' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.referralRewardClaim.findUnique({
        where: { userId_level: { userId, level } }
      });
      if (existing) throw new Error('ALREADY_CLAIMED');
      await applyMilestoneRewardsInTx(tx, userId, milestone);
      await tx.referralRewardClaim.create({
        data: { userId, level, chips: milestone.chips }
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_CLAIMED') {
      return { ok: false as const, error: 'ALREADY_CLAIMED' };
    }
    throw err;
  }

  return { ok: true as const, milestone, chips: milestone.chips };
};
