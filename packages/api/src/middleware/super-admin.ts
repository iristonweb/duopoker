import { createMiddleware } from 'hono/factory';
import { resolveUserRole } from '../services/admin-access.js';
import { authGuard } from './auth.js';

/** Requires valid JWT and User.role === SUPERADMIN. Run after authGuard context is set. */
export const requireSuperAdmin = createMiddleware(async (c, next) => {
  const { userId, email } = c.get('auth');
  const role = await resolveUserRole(userId, email);
  if (role !== 'SUPERADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

export const superAdminGuard = [authGuard, requireSuperAdmin];
