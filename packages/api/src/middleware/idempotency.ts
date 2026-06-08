import type { Context, Next } from 'hono';
import { prisma } from '../lib/prisma.js';

const TTL_MS = 24 * 60 * 60 * 1000;

/** Replay cached JSON response when Idempotency-Key header matches a recent request. */
export const idempotencyGuard = async (c: Context, next: Next) => {
  const key = c.req.header('Idempotency-Key')?.trim();
  if (!key) return next();

  const userId = c.get('auth')?.userId;
  if (!userId) return next();

  const path = c.req.path;
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
  if (existing) {
    if (existing.userId !== userId || existing.path !== path) {
      return c.json({ error: 'Idempotency key conflict', code: 'IDEMPOTENCY_CONFLICT' }, 409);
    }
    if (existing.response) {
      return c.json(existing.response as Record<string, unknown>);
    }
  }

  await next();

  if (c.res.status >= 200 && c.res.status < 300) {
    const body = await c.res.clone().json().catch(() => null);
    if (body) {
      await prisma.idempotencyKey.upsert({
        where: { key },
        create: {
          key,
          userId,
          path,
          response: body,
          expiresAt: new Date(Date.now() + TTL_MS)
        },
        update: { response: body, expiresAt: new Date(Date.now() + TTL_MS) }
      });
    }
  }
};
