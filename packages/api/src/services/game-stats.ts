import { playersWithChips } from '@duopoker/game-engine/index';
import type { SessionState } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { BOT_PREFIX } from './game-session.js';

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

/** Fetched separately so profile/subscription queries survive pending migrations. */
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

const isHumanPlayer = (id: string) =>
  Boolean(id && !id.startsWith(BOT_PREFIX) && !id.startsWith('guest-'));

/** Record match win/loss when a duel ends (one player left with chips). */
export const recordGameOutcome = async (state: SessionState) => {
  const winners = playersWithChips(state);
  if (winners.length !== 1) return;

  const humans = state.players.filter(isHumanPlayer);
  if (!humans.length) return;

  const winnerSet = new Set(winners);

  await prisma.$transaction([
    ...humans.map((userId) =>
      prisma.user.update({
        where: { id: userId },
        data: {
          gamesPlayed: { increment: 1 },
          gamesWon: { increment: winnerSet.has(userId) ? 1 : 0 },
          gamesLost: { increment: winnerSet.has(userId) ? 0 : 1 }
        }
      })
    ),
    prisma.gameSession.updateMany({
      where: { id: state.sessionId },
      data: { status: 'FINISHED', finishedAt: new Date() }
    })
  ]);
};
