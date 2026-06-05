import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const profileSchema = z.object({
  displayName: z.string().min(2),
  avatar: z.string().url().optional()
});

export const profileRoutes = new Hono();

profileRoutes.use('*', authGuard);

profileRoutes.get('/:id', async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.req.param('id') },
    select: { id: true, email: true, displayName: true, avatar: true, chips: true, level: true, xp: true }
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({
    ...user,
    complianceDisclaimer: 'Virtual chips are not redeemable for real money.'
  });
});

profileRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  if (c.get('auth').userId !== id) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: { id: true, email: true, displayName: true, avatar: true, chips: true, level: true, xp: true }
  });
  return c.json(updated);
});
