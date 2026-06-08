#!/usr/bin/env node
/**
 * Advance organizer billing lifecycle and notify owners via Resend.
 * Run via cron: node scripts/dunning-notify.mjs
 */
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();
const GRACE_DAYS = 3;

async function sendDunningEmail(email, { clubName, status }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'DuoPoker <onboarding@resend.dev>';
  const subject =
    status === 'GRACE'
      ? `DuoPoker: renew your ${clubName} club plan`
      : `DuoPoker: ${clubName} plan past due`;
  const html =
    status === 'GRACE'
      ? `<p>Your organizer plan for <strong>${clubName}</strong> entered grace. Renew in the app.</p>`
      : `<p>Your organizer plan for <strong>${clubName}</strong> is past due. Club is on Basic limits.</p>`;

  if (!key) {
    console.log(`[dunning] (no RESEND_API_KEY) ${status} → ${email}: ${subject}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject, html })
  });
  if (!res.ok) console.error(`[dunning] email failed ${email}:`, await res.text());
}

const main = async () => {
  const now = new Date();
  const graceCutoff = new Date(now.getTime() - GRACE_DAYS * 24 * 60 * 60 * 1000);

  const toGrace = await prisma.organizerSubscription.findMany({
    where: { billingStatus: 'ACTIVE', expiresAt: { lt: now }, tier: { not: 'BASIC' } },
    include: { club: { select: { name: true, owner: { select: { email: true } } } } }
  });

  for (const sub of toGrace) {
    await prisma.organizerSubscription.update({
      where: { id: sub.id },
      data: { billingStatus: 'GRACE' }
    });
    if (sub.club.owner.email) {
      await sendDunningEmail(sub.club.owner.email, { clubName: sub.club.name, status: 'GRACE' });
    }
    console.log(`[dunning] GRACE club=${sub.clubId}`);
  }

  const toPastDue = await prisma.organizerSubscription.findMany({
    where: { billingStatus: 'GRACE', expiresAt: { lt: graceCutoff } },
    include: { club: { select: { name: true, owner: { select: { email: true } } } } }
  });

  for (const sub of toPastDue) {
    await prisma.organizerSubscription.update({
      where: { id: sub.id },
      data: { billingStatus: 'PAST_DUE', status: 'EXPIRED' }
    });
    if (sub.club.owner.email) {
      await sendDunningEmail(sub.club.owner.email, { clubName: sub.club.name, status: 'PAST_DUE' });
    }
    console.log(`[dunning] PAST_DUE club=${sub.clubId} owner=${sub.club.owner.email}`);
  }

  console.log(`Done: grace=${toGrace.length} pastDue=${toPastDue.length}`);
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
