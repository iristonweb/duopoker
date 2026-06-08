import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const reportSchema = z.object({
  type: z.string().min(3).max(80).default('user.report'),
  clubId: z.string().optional(),
  targetUserId: z.string().optional(),
  reason: z.string().trim().min(5).max(500),
  context: z.record(z.unknown()).optional()
});

export const complianceRoutes = new Hono();

complianceRoutes.post('/report', authGuard, async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const actorUserId = c.get('auth').userId;
  const { clubId, type, reason, targetUserId, context } = parsed.data;

  if (clubId) {
    const member = await prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId: actorUserId } }
    });
    if (!member) return c.json({ error: 'Club membership required' }, 403);
  }

  const event = await prisma.complianceEvent.create({
    data: {
      clubId: clubId ?? null,
      actorUserId,
      type,
      severity: 'MEDIUM',
      details: { reason, targetUserId, context, source: 'in_app_report' }
    }
  });

  return c.json({ ok: true, reportId: event.id }, 201);
});
