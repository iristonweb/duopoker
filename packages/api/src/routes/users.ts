import { Hono } from 'hono';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { normalizeNicknameInput } from '../lib/nickname.js';

export const usersRoutes = new Hono();

usersRoutes.use('*', authGuard);

usersRoutes.get('/lookup', async (c) => {
  const raw = c.req.query('nickname');
  if (!raw) return c.json({ error: 'nickname query required' }, 400);

  const nickname = normalizeNicknameInput(raw);
  const user = await prisma.user.findUnique({
    where: { nickname },
    select: { id: true, nickname: true, displayName: true, avatar: true }
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ user });
});
