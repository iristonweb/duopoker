import type { SessionState } from '@duopoker/shared-types/index';
import {
  loadSnapshotWithVersion,
  persistSnapshotWithRetry,
  type GameSessionPersistenceClient,
  type LoadedSnapshot,
  type PersistSnapshotResult
} from '@duopoker/server-core/session/persistence';
import { prisma } from './prisma.js';

const persistenceClient: GameSessionPersistenceClient = prisma.gameSession;

export const loadGameSnapshot = async (sessionId: string): Promise<SessionState | null> => {
  const loaded = await loadGameSnapshotWithVersion(sessionId);
  return loaded?.state ?? null;
};

export const loadGameSnapshotWithVersion = async (
  sessionId: string
): Promise<LoadedSnapshot | null> => loadSnapshotWithVersion(persistenceClient, sessionId);

export const persistGameSnapshot = async (
  state: SessionState,
  expectedVersion: number | null = null
): Promise<PersistSnapshotResult> =>
  persistSnapshotWithRetry(persistenceClient, state, expectedVersion, loadGameSnapshotWithVersion);
