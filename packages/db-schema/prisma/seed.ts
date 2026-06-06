import bcrypt from 'bcryptjs';
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();

const LIFETIME_EXPIRES = new Date('2099-12-31T23:59:59.999Z');
const FOUNDER_EMAIL = 'iristonweb@gmail.com';

const ALL_COSMETIC_ITEMS = [
  { id: 'deck_classic', rarity: 'COMMON' as const },
  { id: 'deck_silver', rarity: 'RARE' as const },
  { id: 'deck_gold', rarity: 'EPIC' as const },
  { id: 'deck_platinum', rarity: 'EPIC' as const },
  { id: 'deck_royal', rarity: 'LEGENDARY' as const },
  { id: 'deck_neon', rarity: 'RARE' as const },
  { id: 'chip_classic', rarity: 'COMMON' as const },
  { id: 'chip_silver', rarity: 'RARE' as const },
  { id: 'chip_gold', rarity: 'EPIC' as const },
  { id: 'chip_platinum', rarity: 'EPIC' as const },
  { id: 'chip_royal', rarity: 'LEGENDARY' as const },
  { id: 'table_void', rarity: 'EPIC' as const },
  { id: 'frame_none', rarity: 'COMMON' as const },
  { id: 'frame_silver', rarity: 'RARE' as const },
  { id: 'frame_gold', rarity: 'EPIC' as const },
  { id: 'frame_platinum', rarity: 'EPIC' as const },
  { id: 'frame_royal', rarity: 'LEGENDARY' as const }
];

async function grantFounder(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`Founder ${email} not registered yet — sign up on duopoker.ru first, then re-run seed.`);
    return;
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
      expiresAt: LIFETIME_EXPIRES
    },
    update: { tier: 'ROYAL', status: 'ACTIVE', expiresAt: LIFETIME_EXPIRES }
  });

  for (const item of ALL_COSMETIC_ITEMS) {
    const existing = await prisma.userItem.findFirst({
      where: { userId: user.id, itemId: item.id }
    });
    if (!existing) {
      await prisma.userItem.create({
        data: { userId: user.id, itemId: item.id, rarity: item.rarity, equipped: false }
      });
    }
  }

  console.log(`Founder package granted: ${email} — SUPERADMIN, ROYAL lifetime, all cosmetics`);
}

async function seedSuperAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Skipping superadmin seed (set ADMIN_EMAIL and ADMIN_PASSWORD to create one).');
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const baseNick = email.split('@')[0]?.replace(/[^a-z0-9_]/gi, '').toLowerCase() || 'admin';
  const nickname = baseNick.length >= 3 ? baseNick : 'superadmin';
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPERADMIN',
      emailVerified: true
    },
    create: {
      email,
      passwordHash,
      displayName: 'Platform Admin',
      nickname: nickname.length >= 3 ? nickname : `admin_${Date.now().toString(36).slice(-4)}`,
      role: 'SUPERADMIN',
      emailVerified: true,
      chips: 50000
    }
  });
  console.log(`Superadmin upserted: ${user.email} (${user.role})`);
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@duopoker.dev' },
    update: {},
    create: {
      email: 'demo@duopoker.dev',
      displayName: 'DemoPlayer',
      nickname: 'demoplayer',
      chips: 12000
    }
  });

  await prisma.subscription.upsert({
    where: { id: `${user.id}-gold` },
    update: {},
    create: {
      id: `${user.id}-gold`,
      userId: user.id,
      tier: 'GOLD',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });

  await seedSuperAdmin();
  await grantFounder(FOUNDER_EMAIL);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
