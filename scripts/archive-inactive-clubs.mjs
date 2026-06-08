#!/usr/bin/env node
/** Archive clubs with no activity for 90 days; close stale private tables. */
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();
const INACTIVE_DAYS = 90;

const main = async () => {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const clubs = await prisma.club.findMany({
    where: { isArchived: false, updatedAt: { lt: cutoff } },
    select: { id: true, name: true }
  });

  let archived = 0;
  for (const club of clubs) {
    const recentEvent = await prisma.complianceEvent.findFirst({
      where: { clubId: club.id, createdAt: { gte: cutoff } }
    });
    const liveTable = await prisma.privateTable.findFirst({
      where: { clubId: club.id, status: 'LIVE' }
    });
    if (recentEvent || liveTable) continue;

    await prisma.$transaction([
      prisma.club.update({ where: { id: club.id }, data: { isArchived: true } }),
      prisma.privateTable.updateMany({
        where: { clubId: club.id, status: { in: ['SCHEDULED', 'LIVE'] } },
        data: { status: 'CLOSED', closedAt: new Date(), sessionId: null }
      })
    ]);
    console.log(`[archive] club=${club.id} ${club.name}`);
    archived++;
  }

  console.log(`Archived ${archived} inactive clubs`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
