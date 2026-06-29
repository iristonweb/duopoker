import { decryptProfileRow } from '@duopoker/server-shared/lib/profile-privacy';
import { prisma } from './prisma.js';

export async function resolveChatSender(
  userId: string
): Promise<{ displayName: string; avatar: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { displayName: true, nickname: true, avatar: true }
  });
  if (!user) {
    return { displayName: userId.slice(0, 8), avatar: null };
  }
  const profile = decryptProfileRow(user);
  const displayName = profile.nickname
    ? `@${profile.nickname}`
    : profile.displayName || userId.slice(0, 8);
  return { displayName, avatar: profile.avatar ?? null };
}
