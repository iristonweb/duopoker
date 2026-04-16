import type { SessionState } from '@duopoker/shared-types/index';
import { prisma } from './prisma.js';

const mapStatus = (state: SessionState): 'LOBBY' | 'IN_PROGRESS' => {
  if (state.players.length < 2) return 'LOBBY';
  return 'IN_PROGRESS';
};

export const persistGameSnapshot = async (state: SessionState) => {
  const id = state.sessionId;
  await prisma.gameSession.upsert({
    where: { id },
    create: {
      id,
      mode: state.mode,
      status: mapStatus(state),
      players: state.players,
      buyIn: state.buyIn,
      rake: 0,
      startedAt: state.street === 'LOBBY' ? null : new Date(),
      gameState: JSON.parse(JSON.stringify(state)) as object
    },
    update: {
      players: state.players,
      status: mapStatus(state),
      gameState: JSON.parse(JSON.stringify(state)) as object
    }
  });
};

export const loadGameSnapshot = async (sessionId: string): Promise<SessionState | null> => {
  const row = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    select: { gameState: true }
  });
  if (!row?.gameState || typeof row.gameState !== 'object') return null;
  return row.gameState as unknown as SessionState;
};
