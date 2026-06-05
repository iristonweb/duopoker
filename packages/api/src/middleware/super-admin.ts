import { createMiddleware } from 'hono/factory';
import { prisma } from '../lib/prisma.js';
import { authGuard } from './auth.js';

/** Requires valid JWT and User.role === SUPERADMIN. Run after authGuard context is set. */
export const requireSuperAdmin = createMiddleware(async (c, next) => {
  const userId = c.get('auth').userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (!user || user.role !== 'SUPERADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

export const superAdminGuard = [authGuard, requireSuperAdmin];
