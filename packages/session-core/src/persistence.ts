import type { SessionState } from '@duopoker/shared-types/index';
import { parseLoadedSessionState } from '@duopoker/game-engine/index';

export type GameSessionRow = {
  id: string;
  mode: SessionState['mode'];
  status: 'LOBBY' | 'IN_PROGRESS';
  players: string[];
  buyIn: number;
  rake: number;
  startedAt: Date | null;
  gameState: object;
  gameStateVersion: number;
};

export type GameSessionPersistenceClient = {
  findUnique(args: {
    where: { id: string };
    select: { gameState: true; gameStateVersion: true };
  }): Promise<{ gameState: unknown; gameStateVersion: number } | null>;
  upsert(args: {
    where: { id: string };
    create: Omit<GameSessionRow, 'gameStateVersion'> & { gameStateVersion?: number };
    update: Partial<Pick<GameSessionRow, 'players' | 'status' | 'gameState' | 'gameStateVersion'>>;
  }): Promise<{ gameStateVersion: number }>;
  updateMany(args: {
    where: { id: string; gameStateVersion: number };
    data: Partial<Pick<GameSessionRow, 'players' | 'status' | 'gameState' | 'gameStateVersion'>>;
  }): Promise<{ count: number }>;
};

export type LoadedSnapshot = {
  state: SessionState;
  version: number;
};

export type PersistSnapshotResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'VERSION_CONFLICT' };

const mapStatus = (state: SessionState): 'LOBBY' | 'IN_PROGRESS' => {
  if (state.players.length < 2) return 'LOBBY';
  return 'IN_PROGRESS';
};

const serializeState = (state: SessionState): object =>
  JSON.parse(JSON.stringify(state)) as object;

export const loadSnapshotWithVersion = async (
  client: GameSessionPersistenceClient,
  sessionId: string
): Promise<LoadedSnapshot | null> => {
  const row = await client.findUnique({
    where: { id: sessionId },
    select: { gameState: true, gameStateVersion: true }
  });
  if (!row?.gameState || typeof row.gameState !== 'object') return null;
  const state = parseLoadedSessionState(row.gameState);
  if (!state) return null;
  return {
    state,
    version: row.gameStateVersion
  };
};

export const persistSnapshotWithVersion = async (
  client: GameSessionPersistenceClient,
  state: SessionState,
  expectedVersion: number | null
): Promise<PersistSnapshotResult> => {
  const id = state.sessionId;
  const gameState = serializeState(state);
  const status = mapStatus(state);
  const players = state.players;

  if (expectedVersion === null) {
    const existing = await client.findUnique({
      where: { id },
      select: { gameState: true, gameStateVersion: true }
    });
    if (existing) {
      return persistSnapshotWithVersion(client, state, existing.gameStateVersion);
    }
    const row = await client.upsert({
      where: { id },
      create: {
        id,
        mode: state.mode,
        status,
        players,
        buyIn: state.buyIn,
        rake: 0,
        startedAt: state.street === 'LOBBY' ? null : new Date(),
        gameState,
        gameStateVersion: 1
      },
      update: {
        players,
        status,
        gameState,
        gameStateVersion: 1
      }
    });
    return { ok: true, version: row.gameStateVersion };
  }

  const updated = await client.updateMany({
    where: { id, gameStateVersion: expectedVersion },
    data: {
      players,
      status,
      gameState,
      gameStateVersion: expectedVersion + 1
    }
  });

  if (updated.count === 0) {
    return { ok: false, reason: 'VERSION_CONFLICT' };
  }

  return { ok: true, version: expectedVersion + 1 };
};

/** Retry persist once after reloading on optimistic-lock conflict. */
export const persistSnapshotWithRetry = async (
  client: GameSessionPersistenceClient,
  state: SessionState,
  expectedVersion: number | null,
  reload: (sessionId: string) => Promise<LoadedSnapshot | null>
): Promise<PersistSnapshotResult> => {
  const first = await persistSnapshotWithVersion(client, state, expectedVersion);
  if (first.ok || first.reason !== 'VERSION_CONFLICT') return first;

  const fresh = await reload(state.sessionId);
  if (!fresh) return first;

  return persistSnapshotWithVersion(client, state, fresh.version);
};
