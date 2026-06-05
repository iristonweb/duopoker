import { test, expect } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

const API = 'http://localhost:4000';

const waitForState = (
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

const connectClient = (): Socket =>
  io(API, {
    transports: ['websocket']
  });

async function playHandToComplete(mode: 'HOLDEM' | 'RASPISNOY') {
  const sessionId = `e2e-${mode}-${Date.now()}`;
  const uid1 = `e2e-p1-${Date.now()}`;
  const uid2 = `e2e-p2-${Date.now()}`;
  const p1 = connectClient();
  const p2 = connectClient();

  await Promise.all([
    new Promise<void>((res) => p1.once('connect', () => res())),
    new Promise<void>((res) => p2.once('connect', () => res()))
  ]);

  p1.emit('joinSession', { sessionId, userId: uid1, mode, buyIn: 100 });
  p2.emit('joinSession', { sessionId, userId: uid2, mode, buyIn: 100 });

  let state = await waitForState(p1, (s) => s.street === 'PREFLOP' && s.players.length === 2);

  for (let guard = 0; guard < 40 && state.street !== 'COMPLETE'; guard += 1) {
    const actor = state.players[state.activePlayerIndex]!;
    const sock = actor === uid1 ? p1 : p2;
    const need =
      Math.max(0, ...state.players.map((p) => state.playerRoundBet[p] ?? 0)) -
      (state.playerRoundBet[actor] ?? 0);
    const prevLen = state.actionLog.length;

    if (need === 0) {
      sock.emit('playerAction', { sessionId, userId: actor, type: 'check', at: Date.now() });
    } else {
      sock.emit('playerAction', { sessionId, userId: actor, type: 'call', at: Date.now() });
    }
    state = await waitForState(
      p1,
      (s) => s.actionLog.length > prevLen || s.street === 'COMPLETE'
    );
  }

  expect(state.street).toBe('COMPLETE');
  expect(state.winners?.length).toBeGreaterThan(0);

  const handNum = state.handNumber;
  p1.emit('readyNextHand', { sessionId, userId: uid1 });
  await waitForState(p1, (s) => (s.readyForNextHand ?? []).includes(uid1));

  p2.emit('readyNextHand', { sessionId, userId: uid2 });
  const nextHand = await waitForState(p1, (s) => s.street === 'PREFLOP' && s.handNumber === handNum + 1);
  expect(nextHand.handNumber).toBe(handNum + 1);

  p1.disconnect();
  p2.disconnect();
}

test('socket gameplay — Hold\'em hand through showdown and next hand', async ({ request }, testInfo) => {
  const health = await request.get(`${API}/health`).catch(() => null);
  if (!health?.ok()) {
    testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
    return;
  }
  await playHandToComplete('HOLDEM');
});

test('socket gameplay — Raspisnoy hand through showdown and next hand', async ({ request }, testInfo) => {
  const health = await request.get(`${API}/health`).catch(() => null);
  if (!health?.ok()) {
    testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
    return;
  }
  await playHandToComplete('RASPISNOY');
});

test('stateUpdate hides opponent hole cards', async ({ request }, testInfo) => {
  const health = await request.get(`${API}/health`).catch(() => null);
  if (!health?.ok()) {
    testInfo.skip(true, 'Start backend on port 4000.');
    return;
  }

  const sessionId = `e2e-hide-${Date.now()}`;
  const p1 = connectClient();
  const p2 = connectClient();
  await Promise.all([
    new Promise<void>((res) => p1.once('connect', () => res())),
    new Promise<void>((res) => p2.once('connect', () => res()))
  ]);

  p1.emit('joinSession', { sessionId, userId: 'hide-p1', mode: 'HOLDEM', buyIn: 100 });
  p2.emit('joinSession', { sessionId, userId: 'hide-p2', mode: 'HOLDEM', buyIn: 100 });

  const state = await waitForState(p1, (s) => s.street === 'PREFLOP');
  expect(state.playerCards['hide-p1']?.length).toBe(2);
  expect(state.playerCards['hide-p2']).toEqual([]);
  expect(state.deck).toEqual([]);

  p1.disconnect();
  p2.disconnect();
});
