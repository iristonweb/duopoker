import bcrypt from 'bcryptjs';
import { PrismaClient } from '@duopoker/db-schema';

const prisma = new PrismaClient();

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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
