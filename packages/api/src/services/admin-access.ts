import { prisma } from '../lib/prisma.js';
import { config } from '../config.js';
import { grantFounderPackage } from './admin-grants.js';

export type AppUserRole = 'USER' | 'SUPERADMIN';

export const isFounderEmail = (email: string): boolean =>
  email.toLowerCase().trim() === config.founderEmail;

/** Ensures founder account has SUPERADMIN + perks in DB. Idempotent. */
export const syncFounderPrivileges = async (email: string): Promise<void> => {
  if (!isFounderEmail(email)) return;
  await grantFounderPackage(email);
};

/** Resolves canonical role from DB, syncing founder privileges first. */
export const resolveUserRole = async (
  userId: string,
  email?: string
): Promise<AppUserRole | null> => {
  if (email) await syncFounderPrivileges(email);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (!user) return null;
  return user.role;
};
