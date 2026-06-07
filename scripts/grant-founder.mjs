/**
 * Grant SUPERADMIN + BLACK lifetime + all cosmetics to platform founder.
 * Usage: node scripts/grant-founder.mjs [email]
 */
import { allCosmetics } from '../packages/shared-types/dist/cosmetics.js';
import { closeScriptPrisma, createScriptPrisma } from './create-script-prisma.mjs';

const LIFETIME = new Date('2099-12-31T23:59:59.999Z');
const email = (process.argv[2] ?? 'iristonweb@gmail.com').trim();
const ALL_ITEMS = allCosmetics.map((c) => ({ id: c.id, rarity: c.rarity }));

const ctx = await createScriptPrisma();
const { prisma } = ctx;

try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User ${email} not found. Register first at duopoker.ru`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPERADMIN', emailVerified: true, chips: Math.max(user.chips, 999_999) }
  });

  await prisma.subscription.upsert({
    where: { id: `${user.id}-BLACK` },
    create: {
      id: `${user.id}-BLACK`,
      userId: user.id,
      tier: 'BLACK',
      status: 'ACTIVE',
      expiresAt: LIFETIME
    },
    update: { tier: 'BLACK', status: 'ACTIVE', expiresAt: LIFETIME }
  });

  for (const item of ALL_ITEMS) {
    const exists = await prisma.userItem.findFirst({
      where: { userId: user.id, itemId: item.id }
    });
    if (!exists) {
      await prisma.userItem.create({
        data: { userId: user.id, itemId: item.id, rarity: item.rarity, equipped: false }
      });
    }
  }

  console.log(
    `Done: ${email} → SUPERADMIN, BLACK (lifetime), ${ALL_ITEMS.length} cosmetics, chips ≥ 999999`
  );
} finally {
  await closeScriptPrisma(ctx);
}
