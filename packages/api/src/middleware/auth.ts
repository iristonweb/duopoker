import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../auth/jwt.js';

export const authGuard = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('authorization') ?? '';
  const token = authHeader.replace(/^Bearer /, '');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const payload = verifyAccessToken(token);
    c.set('auth', payload);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
