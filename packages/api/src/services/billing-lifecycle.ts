import type { OrganizerPlanTier } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { sendDunningEmail } from './email.js';

const GRACE_DAYS = 3;

export type OrganizerPlanRow = {
  tier: OrganizerPlanTier;
  status: string;
  billingStatus?: string;
  expiresAt: Date;
} | null | undefined;

/** Effective tier respects billing lifecycle (grace keeps paid tier; past_due/expired → BASIC). */
export const getEffectiveOrganizerTier = (plan: OrganizerPlanRow): OrganizerPlanTier => {
  if (!plan) return 'BASIC';

  const now = new Date();
  const billing = plan.billingStatus ?? 'ACTIVE';

  if (billing === 'CANCELLED' || billing === 'EXPIRED') return 'BASIC';
  if (plan.expiresAt <= now && billing !== 'GRACE' && billing !== 'PAST_DUE') return 'BASIC';
  if (plan.status !== 'ACTIVE' && billing === 'ACTIVE') return 'BASIC';

  if (billing === 'PAST_DUE') return 'BASIC';

  return plan.tier;
};

export const isPlanDowngraded = (plan: OrganizerPlanRow): boolean => {
  if (!plan) return false;
  return plan.tier !== 'BASIC' && getEffectiveOrganizerTier(plan) === 'BASIC';
};

export const changeOrganizerPlan = async (opts: {
  clubId: string;
  ownerId: string;
  targetTier: OrganizerPlanTier;
}) => {
  const sub = await prisma.organizerSubscription.findUnique({ where: { clubId: opts.clubId } });
  if (!sub || sub.ownerId !== opts.ownerId) {
    return { ok: false as const, error: 'NOT_OWNER' };
  }

  const currentEffective = getEffectiveOrganizerTier(sub);
  const isUpgrade =
    ['BASIC', 'PRO', 'NETWORK'].indexOf(opts.targetTier) >
    ['BASIC', 'PRO', 'NETWORK'].indexOf(currentEffective);

  const expiresAt = isUpgrade
    ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 32)
    : sub.expiresAt;

  await prisma.organizerSubscription.update({
    where: { clubId: opts.clubId },
    data: {
      tier: opts.targetTier,
      billingStatus: opts.targetTier === 'BASIC' ? 'CANCELLED' : 'ACTIVE',
      status: opts.targetTier === 'BASIC' ? 'CANCELLED' : 'ACTIVE',
      expiresAt
    }
  });

  return { ok: true as const, tier: opts.targetTier, prorated: isUpgrade };
};

export const advanceBillingLifecycle = async () => {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000);

  const expired = await prisma.organizerSubscription.findMany({
    where: {
      billingStatus: 'ACTIVE',
      expiresAt: { lt: now },
      tier: { not: 'BASIC' }
    }
  });

  for (const sub of expired) {
    await prisma.organizerSubscription.update({
      where: { id: sub.id },
      data: { billingStatus: 'GRACE' }
    });
    const club = await prisma.club.findUnique({
      where: { id: sub.clubId },
      select: { name: true, owner: { select: { email: true } } }
    });
    if (club?.owner.email) {
      await sendDunningEmail(club.owner.email, { clubName: club.name, status: 'GRACE' }).catch(
        () => undefined
      );
    }
  }

  const pastDue = await prisma.organizerSubscription.findMany({
    where: {
      billingStatus: 'GRACE',
      expiresAt: { lt: graceCutoff }
    }
  });

  for (const sub of pastDue) {
    await prisma.organizerSubscription.update({
      where: { id: sub.id },
      data: { billingStatus: 'PAST_DUE', status: 'EXPIRED' }
    });
    const club = await prisma.club.findUnique({
      where: { id: sub.clubId },
      select: { name: true, owner: { select: { email: true } } }
    });
    if (club?.owner.email) {
      await sendDunningEmail(club.owner.email, { clubName: club.name, status: 'PAST_DUE' }).catch(
        () => undefined
      );
    }
  }

  return { grace: expired.length, pastDue: pastDue.length };
};
