import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { superAdminGuard } from '../middleware/super-admin.js';

export const adminRoutes = new Hono();

adminRoutes.use('*', ...superAdminGuard);

adminRoutes.get('/health', (c) =>
  c.json({ ok: true, role: 'SUPERADMIN', timestamp: new Date().toISOString() })
);

adminRoutes.get('/users', async (c) => {
  const take = Math.min(Number(c.req.query('take') ?? 50), 100);
  const skip = Math.max(Number(c.req.query('skip') ?? 0), 0);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        nickname: true,
        role: true,
        chips: true,
        emailVerified: true,
        createdAt: true
      }
    }),
    prisma.user.count()
  ]);
  return c.json({ users, total, take, skip });
});
