#!/usr/bin/env node
/** Nightly integrity check — dangling memberships, orphan tables, over-limit clubs. */
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();

const PLAN_LIMITS = {
  BASIC: { maxMembers: 30, maxActiveTables: 2 },
  PRO: { maxMembers: 150, maxActiveTables: 8 },
  NETWORK: { maxMembers: 600, maxActiveTables: 20 }
};

const effectiveTier = (plan) => {
  if (!plan || plan.billingStatus === 'PAST_DUE' || plan.billingStatus === 'CANCELLED') return 'BASIC';
  if (plan.expiresAt <= new Date()) return 'BASIC';
  return plan.tier;
};

const main = async () => {
  let issues = 0;

  const multiOwner = await prisma.$queryRaw`
    SELECT "clubId", COUNT(*)::int AS cnt
    FROM club_memberships
    WHERE role = 'OWNER'
    GROUP BY "clubId"
    HAVING COUNT(*) > 1
  `;
  if (multiOwner.length) {
    console.error('[integrity] multiple owners:', multiOwner);
    issues += multiOwner.length;
  }

  const orphanTables = await prisma.privateTable.findMany({
    where: { club: { isArchived: true }, status: { in: ['SCHEDULED', 'LIVE'] } },
    select: { id: true, clubId: true }
  });
  if (orphanTables.length) {
    console.error('[integrity] active tables on archived clubs:', orphanTables.length);
    issues += orphanTables.length;
  }

  const clubs = await prisma.club.findMany({
    where: { isArchived: false },
    include: {
      organizerPlan: true,
      _count: { select: { members: true, privateTables: true } }
    }
  });

  for (const club of clubs) {
    const tier = effectiveTier(club.organizerPlan);
    const limits = PLAN_LIMITS[tier];
    if (club._count.members > limits.maxMembers) {
      console.error(`[integrity] over member limit club=${club.id} ${club._count.members}/${limits.maxMembers}`);
      issues++;
    }
    const activeTables = await prisma.privateTable.count({
      where: { clubId: club.id, status: { in: ['SCHEDULED', 'LIVE'] } }
    });
    if (activeTables > limits.maxActiveTables) {
      console.error(`[integrity] over table limit club=${club.id} ${activeTables}/${limits.maxActiveTables}`);
      issues++;
    }
  }

  console.log(issues ? `FAILED with ${issues} issue(s)` : 'OK');
  process.exit(issues ? 1 : 0);
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
