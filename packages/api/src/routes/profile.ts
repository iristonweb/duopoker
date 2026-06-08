import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { isValidNickname, normalizeNicknameInput } from '../lib/nickname.js';
import {
  decryptProfileRow,
  encryptProfileWrite,
  ownerProfileSelect,
  publicProfileSelect,
  safeAvatarField
} from '../lib/profile-privacy.js';
import { equipCosmeticItem } from '../services/cosmetics-equip.js';

const profileSchema = z
  .object({
    displayName: z.string().min(2).max(40).optional(),
    avatar: safeAvatarField.optional().nullable(),
    tableStatus: z.string().max(80).optional().nullable()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required'
  });

const nicknameSchema = z.object({
  nickname: z.string().min(3).max(20)
});

const equipCosmeticSchema = z.object({
  itemId: z.string().min(1)
});

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

profileRoutes.put('/me/cosmetics/equip', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = equipCosmeticSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const result = await equipCosmeticItem(userId, parsed.data.itemId);
  if (!result.ok) {
    const status = result.error === 'NOT_ALLOWED' ? 403 : 404;
    return c.json({ error: result.error }, status);
  }
  return c.json({ equipped: result.equipped });
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

const deleteRequestSchema = z.object({
  reason: z.string().trim().max(500).optional()
});

profileRoutes.post('/delete-request', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => ({}));
  const parsed = deleteRequestSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const pending = await prisma.accountDeletionRequest.findFirst({
    where: { userId, status: 'PENDING' }
  });
  if (pending) {
    return c.json({ ok: true, requestId: pending.id, status: 'PENDING' });
  }

  const request = await prisma.accountDeletionRequest.create({
    data: { userId, reason: parsed.data.reason }
  });

  await prisma.complianceEvent.create({
    data: {
      actorUserId: userId,
      type: 'account.deletion_requested',
      severity: 'INFO',
      details: { requestId: request.id, reason: parsed.data.reason }
    }
  });

  return c.json({ ok: true, requestId: request.id, status: 'PENDING' }, 201);
});

profileRoutes.put('/me', async (c) => {
  const userId = c.get('auth').userId;
  const body = await c.req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: encryptProfileWrite(parsed.data),
    select: ownerProfileSelect
  });
  return c.json(decryptProfileRow(updated));
});

profileRoutes.get('/:id', async (c) => {
  const requesterId = c.get('auth').userId;
  const id = c.req.param('id');
  const select = id === requesterId ? ownerProfileSelect : publicProfileSelect;
  const user = await prisma.user.findUnique({ where: { id }, select });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({
    ...decryptProfileRow(user),
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
    data: encryptProfileWrite(parsed.data),
    select: ownerProfileSelect
  });
  return c.json(decryptProfileRow(updated));
});
