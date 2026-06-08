#!/usr/bin/env node
/** Capture monthly club usage snapshots for billing cycle reporting. */
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();

const main = async () => {
  const now = new Date();
  const billingCycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const clubs = await prisma.club.findMany({
    where: { isArchived: false },
    include: { _count: { select: { members: true } } }
  });

  for (const club of clubs) {
    const activeTableCount = await prisma.privateTable.count({
      where: { clubId: club.id, status: { in: ['SCHEDULED', 'LIVE'] } }
    });
    await prisma.clubUsageSnapshot.create({
      data: {
        clubId: club.id,
        memberCount: club._count.members,
        activeTableCount,
        billingCycleStart
      }
    });
  }
  console.log(`Captured ${clubs.length} club usage snapshots`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
