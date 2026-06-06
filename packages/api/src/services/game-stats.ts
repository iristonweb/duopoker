import { playersWithChips } from '@duopoker/game-engine/index';
import type { SessionState } from '@duopoker/shared-types';
import { prisma } from '../lib/prisma.js';
import { BOT_PREFIX } from './game-session.js';

const isHumanPlayer = (id: string) =>
  Boolean(id && !id.startsWith(BOT_PREFIX) && !id.startsWith('guest-'));

/** Record match win/loss when a duel ends (one player left with chips). */
export const recordGameOutcome = async (state: SessionState) => {
  const winners = playersWithChips(state);
  if (winners.length !== 1) return;

  const humans = state.players.filter(isHumanPlayer);
  if (!humans.length) return;

  const winnerId = winners[0]!;
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
