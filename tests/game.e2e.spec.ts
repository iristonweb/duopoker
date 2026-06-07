import { test, expect } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';
import {
  isJokerCard,
  isNominalTrumpBanned,
  jokerLegalPlays,
  leadSuitFromTrick
} from '@duopoker/shared-types/index';

const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';

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

const pickJokerPlay = (state: SessionState, actor: string) => {
  const hand = state.playerCards[actor] ?? [];
  const trump = state.joker?.trumpSuit ?? null;
  const lead = leadSuitFromTrick(state.joker?.currentTrick ?? []);
  const legal = jokerLegalPlays(hand, lead, trump, state.jokerRules?.strictJoker);
  const card = legal[0] ?? hand[0];
  if (!card) throw new Error(`no legal card for ${actor}`);
  if (isJokerCard(card)) {
    const declaration = isNominalTrumpBanned(card, trump, state.joker?.voidTrumpDiscards)
      ? 'senior'
      : 'senior';
    return { card, declaration };
  }
  return { card, declaration: undefined };
};

const playJokerActionsUntilComplete = async (
  sessionId: string,
  sockets: Socket[],
  uids: string[],
  startState: SessionState
): Promise<SessionState> => {
  const socketByUser = new Map(uids.map((uid, i) => [uid, sockets[i]!]));
  let state = startState;

  for (let guard = 0; guard < 120 && state.street !== 'COMPLETE'; guard += 1) {
    const actor = state.players[state.activePlayerIndex]!;
    const sock = socketByUser.get(actor)!;
    const prevLen = state.actionLog.length;

    if (state.street === 'BIDDING') {
      sock.emit('playerAction', { sessionId, userId: actor, type: 'bid', amount: 0, at: Date.now() });
    } else if (state.street === 'TRUMP_CHOICE') {
      sock.emit('playerAction', {
        sessionId,
        userId: actor,
        type: 'chooseTrump',
        trumpSuit: 'H',
        at: Date.now()
      });
    } else if (state.street === 'TRICKS') {
      const { card, declaration } = pickJokerPlay(state, actor);
      sock.emit('playerAction', {
        sessionId,
        userId: actor,
        type: 'playCard',
        card,
        declaration,
        at: Date.now()
      });
    } else {
      break;
    }

    state = await waitForState(
      sockets[0]!,
      (s) => s.actionLog.length > prevLen || s.street === 'COMPLETE' || s.street !== state.street
    );
  }

  expect(state.street).toBe('COMPLETE');
  return state;
};

const readyAllJokerPlayers = async (
  sessionId: string,
  sockets: Socket[],
  uids: string[],
  state: SessionState
): Promise<SessionState> => {
  const handNum = state.handNumber;
  for (const uid of uids) {
    const sock = sockets[uids.indexOf(uid)]!;
    sock.emit('readyNextHand', { sessionId, userId: uid });
    await waitForState(sockets[0]!, (s) => (s.readyForNextHand ?? []).includes(uid));
  }
  return waitForState(
    sockets[0]!,
    (s) => s.handNumber === handNum + 1 && s.street !== 'COMPLETE',
    20_000
  );
};

async function playHoldemHandToComplete() {
  const sessionId = `e2e-HOLDEM-${Date.now()}`;
  const uid1 = `e2e-p1-${Date.now()}`;
  const uid2 = `e2e-p2-${Date.now()}`;
  const p1 = connectClient();
  const p2 = connectClient();

  await Promise.all([
    new Promise<void>((res) => p1.once('connect', () => res())),
    new Promise<void>((res) => p2.once('connect', () => res()))
  ]);

  p1.emit('joinSession', { sessionId, userId: uid1, mode: 'HOLDEM', buyIn: 100 });
  p2.emit('joinSession', { sessionId, userId: uid2, mode: 'HOLDEM', buyIn: 100 });

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

async function startJokerSession() {
  const sessionId = `e2e-JOKER-${Date.now()}`;
  const uids = [1, 2, 3, 4].map((n) => `e2e-j${n}-${Date.now()}-${n}`);
  const sockets = uids.map(() => connectClient());

  await Promise.all(sockets.map((s) => new Promise<void>((res) => s.once('connect', () => res()))));

  uids.forEach((uid, i) => {
    sockets[i]!.emit('joinSession', { sessionId, userId: uid, mode: 'JOKER', buyIn: 100 });
  });

  const state = await waitForState(sockets[0]!, (s) => s.street === 'BIDDING' && s.players.length === 4);
  return { sessionId, uids, sockets, state };
}

async function playJokerHandToComplete() {
  const { sessionId, uids, sockets, state } = await startJokerSession();
  const final = await playJokerActionsUntilComplete(sessionId, sockets, uids, state);

  expect(final.mode).toBe('JOKER');
  expect(final.players.length).toBe(4);
  expect(final.joker?.handPoints).toBeDefined();

  sockets.forEach((s) => s.disconnect());
}

async function playJokerHands(handCount: number) {
  const { sessionId, uids, sockets, state } = await startJokerSession();
  let current = state;

  for (let h = 0; h < handCount; h += 1) {
    current = await playJokerActionsUntilComplete(sessionId, sockets, uids, current);
    expect(current.joker?.handPoints).toBeDefined();
    if (h < handCount - 1) {
      current = await readyAllJokerPlayers(sessionId, sockets, uids, current);
      expect(current.street).not.toBe('COMPLETE');
    }
  }

  sockets.forEach((s) => s.disconnect());
  return current;
}

const skipWithoutBackend = async (
  request: { get: (url: string) => Promise<{ ok: () => boolean }> },
  testInfo: { skip: (condition: boolean, reason: string) => void }
) => {
  const health = await request.get(`${API}/health`).catch(() => null);
  if (!health?.ok()) {
    testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
    return false;
  }
  return true;
};

test('socket gameplay — Hold\'em hand through showdown and next hand', async ({ request }, testInfo) => {
  if (!(await skipWithoutBackend(request, testInfo))) return;
  await playHoldemHandToComplete();
});

test('socket gameplay — Joker hand through bidding, tricks, and complete', async ({ request }, testInfo) => {
  if (!(await skipWithoutBackend(request, testInfo))) return;
  await playJokerHandToComplete();
});

test('socket gameplay — Joker plays 3 consecutive hands with readyNextHand', async ({ request }, testInfo) => {
  if (!(await skipWithoutBackend(request, testInfo))) return;
  const final = await playJokerHands(3);
  expect(final.handNumber).toBeGreaterThanOrEqual(3);
  expect(final.joker?.matchHandIndex).toBeGreaterThanOrEqual(2);
});

test('socket gameplay — Joker full 24-hand match', async ({ request }, testInfo) => {
  test.setTimeout(600_000);
  test.slow();
  if (process.env.E2E_FULL_JOKER_MATCH !== '1') {
    testInfo.skip(true, 'Set E2E_FULL_JOKER_MATCH=1 to run the full 24-hand socket match.');
    return;
  }
  if (!(await skipWithoutBackend(request, testInfo))) return;
  const final = await playJokerHands(24);
  expect(final.joker?.matchHandIndex).toBe(23);
  expect(final.joker?.dealHistory?.length).toBe(24);
});

test('stateUpdate hides opponent hole cards', async ({ request }, testInfo) => {
  if (!(await skipWithoutBackend(request, testInfo))) return;

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
  expect(state.playerCards['hide-p2']).toEqual([]);

  p1.disconnect();
  p2.disconnect();
});
