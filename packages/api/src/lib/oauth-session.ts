import { signAccessToken, signRefreshToken } from '../auth/jwt.js';
import { prisma } from '../lib/prisma.js';

export const issueOAuthSession = async (userId: string, email: string, deviceId: string) => {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, email });
  await prisma.deviceSession.deleteMany({ where: { userId } });
  await prisma.deviceSession.create({
    data: {
      userId,
      refreshToken,
      deviceId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
    }
  });
  return { accessToken, refreshToken };
};
