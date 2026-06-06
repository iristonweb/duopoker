import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { isValidNickname, normalizeNicknameInput } from '../lib/nickname.js';

const avatarField = z
  .string()
  .max(600_000)
  .refine(
    (v) => v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image/'),
    'Avatar must be a URL or image data URL'
  );

const profileSchema = z
  .object({
    displayName: z.string().min(2).max(40).optional(),
    avatar: avatarField.optional().nullable(),
    tableStatus: z.string().max(80).optional().nullable()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required'
  });

const nicknameSchema = z.object({
  nickname: z.string().min(3).max(20)
});

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  nickname: true,
  avatar: true,
  tableStatus: true,
  chips: true,
  level: true,
  xp: true
} as const;

export const profileRoutes = new Hono();

profileRoutes.use('*', authGuard);

profileRoutes.get('/me/nickname', async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.get('auth').userId },
    select: { id: true, nickname: true, displayName: true }
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

profileRoutes.put('/me/nickname', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = nicknameSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const nickname = normalizeNicknameInput(parsed.data.nickname);
  if (!isValidNickname(nickname)) {
    return c.json({ error: 'Nickname must be 3-20 chars: lowercase letters, numbers, underscore' }, 400);
  }

  const existing = await prisma.user.findUnique({ where: { nickname } });
  if (existing && existing.id !== userId) {
    return c.json({ error: 'Nickname already taken' }, 409);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { nickname },
    select: { id: true, nickname: true, displayName: true }
  });
  return c.json(updated);
});

profileRoutes.get('/:id', async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.req.param('id') },
    select: userSelect
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
    select: userSelect
  });
  return c.json(updated);
});
