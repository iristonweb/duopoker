import type { OrganizerPlanTier } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { LIFETIME_EXPIRES } from './admin-grants.js';

export const PLAN_LIMITS = {
  BASIC: { maxMembers: 30, maxActiveTables: 2 },
  PRO: { maxMembers: 150, maxActiveTables: 8 },
  NETWORK: { maxMembers: 600, maxActiveTables: 20 }
} as const;

export { ORGANIZER_PLAN_PRICES_RUB } from '@duopoker/shared-types';

export const NON_GAMBLING_DISCLAIMER =
  'DuoPoker private clubs are play-money only. No cashout, no rake, no payout handling, and no peer-to-peer money transfers in product.';

export const effectiveMaxPlayers = (maxPlayers: number) => Math.min(maxPlayers, 6);

type OrganizerPlanRow = {
  tier: OrganizerPlanTier;
  status: string;
  expiresAt: Date;
} | null | undefined;

export const getEffectiveOrganizerTier = (plan: OrganizerPlanRow): OrganizerPlanTier => {
  if (!plan || plan.status !== 'ACTIVE' || plan.expiresAt <= new Date()) {
    return 'BASIC';
  }
  return plan.tier;
};

export const grantOrganizerPlan = async (
  clubId: string,
  tier: OrganizerPlanTier,
  lifetime = false
) => {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, ownerId: true, name: true }
  });
  if (!club) return { ok: false as const, error: 'CLUB_NOT_FOUND' };

  const expiresAt = lifetime
    ? LIFETIME_EXPIRES
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 32);

  await prisma.organizerSubscription.upsert({
    where: { clubId },
    create: {
      clubId,
      ownerId: club.ownerId,
      tier,
      status: 'ACTIVE',
      billingProvider: 'STRIPE',
      providerSubscriptionId: `admin-grant-${clubId}`,
      expiresAt
    },
    update: {
      tier,
      status: 'ACTIVE',
      expiresAt
    }
  });

  return { ok: true as const, clubId, tier, lifetime, clubName: club.name };
};

export const revokeOrganizerPlan = async (clubId: string) => {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, name: true }
  });
  if (!club) return { ok: false as const, error: 'CLUB_NOT_FOUND' };

  await prisma.organizerSubscription.updateMany({
    where: { clubId, status: 'ACTIVE' },
    data: { status: 'CANCELLED', tier: 'BASIC', expiresAt: new Date() }
  });

  return { ok: true as const, clubId, clubName: club.name };
};
