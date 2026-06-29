import { Router } from 'express';
import { authGuard } from '../middleware/auth-guard.js';
import { normalizeNicknameInput } from '@duopoker/server-shared/lib/nickname';
import { prisma } from '../services/prisma.js';

export const usersRouter = Router();

usersRouter.use(authGuard);

usersRouter.get('/lookup', async (req, res) => {
  const raw = req.query.nickname;
  if (typeof raw !== 'string' || !raw) {
    return res.status(400).json({ error: 'nickname query required' });
  }
  const nickname = normalizeNicknameInput(raw);
  const user = await prisma.user.findUnique({
    where: { nickname },
    select: { id: true, nickname: true, displayName: true, avatar: true }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});
