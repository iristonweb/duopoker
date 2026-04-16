import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@duopoker.dev' },
    update: {},
    create: {
      email: 'demo@duopoker.dev',
      displayName: 'DemoPlayer',
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
