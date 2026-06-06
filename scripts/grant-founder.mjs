/**
 * Grant SUPERADMIN + ROYAL lifetime + all cosmetics to platform founder.
 * Usage: node scripts/grant-founder.mjs [email]
 * Requires DATABASE_URL in env (or .env loaded by your shell).
 */
import { PrismaClient } from '@duopoker/db-schema';

const LIFETIME = new Date('2099-12-31T23:59:59.999Z');
const email = (process.argv[2] ?? 'iristonweb@gmail.com').trim();

const ALL_ITEMS = [
  { id: 'deck_classic', rarity: 'COMMON' },
  { id: 'deck_silver', rarity: 'RARE' },
  { id: 'deck_gold', rarity: 'EPIC' },
  { id: 'deck_platinum', rarity: 'EPIC' },
  { id: 'deck_royal', rarity: 'LEGENDARY' },
  { id: 'deck_neon', rarity: 'RARE' },
  { id: 'chip_classic', rarity: 'COMMON' },
  { id: 'chip_silver', rarity: 'RARE' },
  { id: 'chip_gold', rarity: 'EPIC' },
  { id: 'chip_platinum', rarity: 'EPIC' },
  { id: 'chip_royal', rarity: 'LEGENDARY' },
  { id: 'table_void', rarity: 'EPIC' },
  { id: 'frame_none', rarity: 'COMMON' },
  { id: 'frame_silver', rarity: 'RARE' },
  { id: 'frame_gold', rarity: 'EPIC' },
  { id: 'frame_platinum', rarity: 'EPIC' },
  { id: 'frame_royal', rarity: 'LEGENDARY' }
];

const prisma = new PrismaClient();

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
  where: { id: `${user.id}-ROYAL` },
  create: {
    id: `${user.id}-ROYAL`,
    userId: user.id,
    tier: 'ROYAL',
    status: 'ACTIVE',
    expiresAt: LIFETIME
  },
  update: { tier: 'ROYAL', status: 'ACTIVE', expiresAt: LIFETIME }
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

console.log(`Done: ${email} → SUPERADMIN, ROYAL (lifetime), ${ALL_ITEMS.length} cosmetics, chips ≥ 999999`);
await prisma.$disconnect();
