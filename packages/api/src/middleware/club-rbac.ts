import type { Context, Next } from 'hono';
import { prisma } from '../lib/prisma.js';

type ClubRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export const requireClubRole = (clubId: string, userId: string, roles: ClubRole[]) =>
  prisma.clubMembership
    .findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { role: true }
    })
    .then((m) => Boolean(m && roles.includes(m.role)));

export const requireClubMember = (clubId: string, userId: string) =>
  prisma.clubMembership.findUnique({ where: { clubId_userId: { clubId, userId } } });

export const requireClubAdmin = (clubId: string, userId: string) =>
  requireClubRole(clubId, userId, ['OWNER', 'ADMIN']);

export const clubRbac =
  (roles: ClubRole[]) =>
  async (c: Context, next: Next) => {
    const clubId = c.req.param('clubId');
    const userId = c.get('auth').userId;
    if (!(await requireClubRole(clubId, userId, roles))) {
      return c.json({ error: 'Insufficient club role', code: 'CLUB_FORBIDDEN' }, 403);
    }
    return next();
  };
