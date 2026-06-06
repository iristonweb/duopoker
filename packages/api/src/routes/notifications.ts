import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { getVapidPublicKey } from '../services/notifications/web-push.js';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

const deviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']).default('android')
});

export const notificationRoutes = new Hono();

notificationRoutes.use('*', authGuard);

notificationRoutes.get('/vapid-public-key', (c) => {
  const key = getVapidPublicKey();
  return c.json({ publicKey: key });
});

notificationRoutes.post('/subscribe', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const { endpoint, keys } = parsed.data;
  const userAgent = c.req.header('user-agent') ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent }
  });

  return c.json({ ok: true });
});

notificationRoutes.delete('/subscribe/all', async (c) => {
  const userId = c.get('auth').userId;
  await prisma.pushSubscription.deleteMany({ where: { userId } });
  return c.json({ ok: true });
});

notificationRoutes.delete('/subscribe', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint: parsed.data.endpoint }
  });

  return c.json({ ok: true });
});

notificationRoutes.post('/device-token', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = deviceTokenSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await prisma.deviceToken.upsert({
    where: { token: parsed.data.token },
    update: { userId, platform: parsed.data.platform },
    create: { userId, token: parsed.data.token, platform: parsed.data.platform }
  });

  return c.json({ ok: true });
});

notificationRoutes.delete('/device-token', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = deviceTokenSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  await prisma.deviceToken.deleteMany({
    where: { userId, token: parsed.data.token }
  });

  return c.json({ ok: true });
});
