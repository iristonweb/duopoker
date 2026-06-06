import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { grantFounderPackage } from './admin-grants.js';

export type AppUserRole = 'USER' | 'SUPERADMIN';

export const isFounderEmail = (email: string): boolean =>
  email.toLowerCase().trim() === config.founderEmail;

/** Fast path: ensure founder role in DB without re-granting cosmetics/subscription. */
export const ensureFounderRole = async (email: string): Promise<void> => {
  if (!isFounderEmail(email)) return;
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, role: true }
  });
  if (!user || user.role === 'SUPERADMIN') return;
  await prisma.user.update({
    where: { id: user.id },
    data: { role: 'SUPERADMIN', emailVerified: true }
  });
};

/** Full founder bootstrap (role + BLACK + cosmetics). Use on login/register only. */
export const syncFounderPrivileges = async (email: string): Promise<void> => {
  if (!isFounderEmail(email)) return;
  const result = await grantFounderPackage(email);
  if (!result.ok) {
    console.warn('[founder] bootstrap failed:', result.error, email);
  }
};

/** Resolves canonical role from DB. */
export const resolveUserRole = async (
  userId: string,
  email?: string,
  options?: { bootstrapFounder?: boolean }
): Promise<AppUserRole | null> => {
  if (email) {
    if (options?.bootstrapFounder) await syncFounderPrivileges(email);
    else await ensureFounderRole(email);
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (!user) return null;
  return user.role;
};
