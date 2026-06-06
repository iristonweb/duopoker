import { Hono } from 'hono';
import { z } from 'zod';
import { authGuard } from '../middleware/auth.js';
import { applyReferralCode, claimReferralMilestone, getReferralDashboard } from '../services/referrals.js';

export const referralRoutes = new Hono();

referralRoutes.use('*', authGuard);

referralRoutes.get('/me', async (c) => {
  const userId = c.get('auth').userId;
  const dashboard = await getReferralDashboard(userId);
  return c.json(dashboard);
});

referralRoutes.post('/apply', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ code: z.string().min(3).max(24) }).safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid code' }, 400);

  const result = await applyReferralCode(c.get('auth').userId, parsed.data.code);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

referralRoutes.post('/claim/:level', async (c) => {
  const level = Number(c.req.param('level'));
  if (!Number.isInteger(level) || level < 1) return c.json({ error: 'Invalid level' }, 400);

  const result = await claimReferralMilestone(c.get('auth').userId, level);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json(result);
});
