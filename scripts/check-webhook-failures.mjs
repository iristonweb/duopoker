#!/usr/bin/env node
/** Alert when recent payment webhooks failed (exit 1 for CI notification). */
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();
const WINDOW_HOURS = 6;
const FAIL_THRESHOLD = 3;

const main = async () => {
  const since = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);
  const failed = await prisma.paymentEvent.count({
    where: { status: 'FAILED', createdAt: { gte: since } }
  });

  console.log(`Failed payment events in last ${WINDOW_HOURS}h: ${failed}`);
  if (failed >= FAIL_THRESHOLD) {
    console.error(`ALERT: ${failed} failed payment events (threshold ${FAIL_THRESHOLD})`);
    process.exit(1);
  }
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
