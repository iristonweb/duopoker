import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

export const E2E_WEB_BASE = 'http://127.0.0.1:5180';
export const E2E_API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';

export const waitForState = (
  socket: Socket,
  predicate: (s: SessionState) => boolean,
  timeoutMs = 15_000
): Promise<SessionState> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('stateUpdate', onUpdate);
      reject(new Error('stateUpdate timeout'));
    }, timeoutMs);

    const onUpdate = (state: SessionState) => {
      if (predicate(state)) {
        clearTimeout(timer);
        socket.off('stateUpdate', onUpdate);
        resolve(state);
      }
    };
    socket.on('stateUpdate', onUpdate);
  });

export type HoldemTableSession = {
  sessionId: string;
  userId: string;
  userId2: string;
};

/** Join a 2-player Hold'em session and wait until preflop starts. */
export async function createHoldemTableSession(): Promise<HoldemTableSession> {
  const sessionId = `e2e-table-ui-${Date.now()}`;
  const userId = `e2e-p1-${Date.now()}`;
  const userId2 = `e2e-p2-${Date.now()}`;

  const p1 = io(E2E_API_BASE, { transports: ['websocket'] });
  const p2 = io(E2E_API_BASE, { transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((res) => p1.once('connect', () => res())),
    new Promise<void>((res) => p2.once('connect', () => res()))
  ]);

  p1.emit('joinSession', { sessionId, userId, mode: 'HOLDEM', buyIn: 100 });
  p2.emit('joinSession', { sessionId, userId: userId2, mode: 'HOLDEM', buyIn: 100 });

  try {
    await waitForState(p1, (s) => s.street === 'PREFLOP' && s.players.length === 2, 12_000);
  } finally {
    p1.disconnect();
    p2.disconnect();
  }

  return { sessionId, userId, userId2 };
}

export async function seedTableUser(page: import('@playwright/test').Page, userId: string) {
  await page.addInitScript((uid) => {
    localStorage.setItem('duopoker_user_id', uid);
    localStorage.setItem('duopoker_guest_id', uid);
  }, userId);
}

export async function openTableAsHero(page: import('@playwright/test').Page, sessionId: string, userId: string) {
  await seedTableUser(page, userId);
  await page.goto(`${E2E_WEB_BASE}/table/${encodeURIComponent(sessionId)}`);
}
