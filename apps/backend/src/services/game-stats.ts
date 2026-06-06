import { prisma } from './prisma.js';

export type UserGameStats = {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
};

export const defaultGameStats = (): UserGameStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0
});

const isSchemaLagError = (error: unknown) =>
  error &&
  typeof error === 'object' &&
  'code' in error &&
  (String((error as { code?: string }).code) === 'P2021' ||
    String((error as { code?: string }).code) === 'P2022');

export const fetchUserGameStats = async (userId: string): Promise<UserGameStats> => {
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { gamesPlayed: true, gamesWon: true, gamesLost: true }
    });
    return row ?? defaultGameStats();
  } catch (error) {
    if (isSchemaLagError(error)) return defaultGameStats();
    throw error;
  }
};
