import { test, expect } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';
import {
  isJokerCard,
  isNominalTrumpBanned,
  jokerLegalPlays,
  leadInfoFromTrick
} from '@duopoker/shared-types/index';

const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:4000';

const HAND_WAIT_MS = 30_000;
const MULTI_HAND_WAIT_MS = 45_000;

type SessionErrorPayload = { code?: string };

const waitForState = (
  socket: Socket,
  predicate: (s: SessionState) => boolean,
  timeoutMs = HAND_WAIT_MS
): Promise<SessionState> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('stateUpdate timeout'));
    }, timeoutMs);

    const onUpdate = (state: SessionState) => {
      if (predicate(state)) {
        cleanup();
        resolve(state);
      }
    };

    const onError = (payload: SessionErrorPayload) => {
      cleanup();
      reject(new Error(`sessionError while waiting: ${payload?.code ?? 'UNKNOWN'}`));
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('stateUpdate', onUpdate);
      socket.off('sessionError', onError);
    };

    socket.on('stateUpdate', onUpdate);
    socket.on('sessionError', onError);
  });

const connectClient = (): Socket =>
  io(API, {
    transports: ['websocket']
  });

const pickJokerPlay = (state: SessionState, actor: string) => {
  const hand = state.playerCards[actor] ?? [];
  const trump = state.joker?.trumpSuit ?? null;
  const lead = leadInfoFromTrick(state.joker?.currentTrick ?? []);
  const legal = jokerLegalPlays(hand, lead.suit, trump, state.jokerRules?.strictJoker, lead.rankMode);
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
    const prevStreet = state.street;

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
      throw new Error(`unexpected joker street: ${state.street}`);
    }

    state = await waitForState(
      sock,
      (s) => s.actionLog.length > prevLen || s.street === 'COMPLETE' || s.street !== prevStreet,
      HAND_WAIT_MS
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
    await waitForState(sock, (s) => (s.readyForNextHand ?? []).includes(uid), HAND_WAIT_MS);
  }
  return waitForState(
    sockets[0]!,
    (s) => s.handNumber === handNum + 1 && s.street !== 'COMPLETE',
    MULTI_HAND_WAIT_MS
  );
};

async function playHoldemHandToComplete() {
  const sessionId = `e2e-HOLDEM-${Date.now()}`;
  const uid1 = `e2e-p1-${Date.now()}`;
  const uid2 = `e2e-p2-${Date.now()}`;
  const p1 = connectClient();
  const p2 = connectClient();

  try {
    await Promise.all([
      new Promise<void>((res) => p1.once('connect', () => res())),
      new Promise<void>((res) => p2.once('connect', () => res()))
    ]);

    p1.emit('joinSession', { sessionId, userId: uid1, mode: 'HOLDEM', buyIn: 100 });
    p2.emit('joinSession', { sessionId, userId: uid2, mode: 'HOLDEM', buyIn: 100 });

    let state = await waitForState(p1, (s) => s.street === 'PREFLOP' && s.players.length === 2, HAND_WAIT_MS);

    for (let guard = 0; guard < 60 && state.street !== 'COMPLETE'; guard += 1) {
      if (state.street === 'SHOWDOWN') {
        state = await waitForState(p1, (s) => s.street === 'COMPLETE', HAND_WAIT_MS);
        break;
      }

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
        sock,
        (s) => s.actionLog.length > prevLen || s.street === 'COMPLETE',
        HAND_WAIT_MS
      );
    }

    expect(state.street).toBe('COMPLETE');
    expect(state.winners?.length).toBeGreaterThan(0);

    const handNum = state.handNumber;
    // Emit both ready signals — next hand may start via ready or auto-start after NEXT_HAND_DELAY_MS.
    p1.emit('readyNextHand', { sessionId, userId: uid1 });
    p2.emit('readyNextHand', { sessionId, userId: uid2 });
    const nextHand = await waitForState(
      p1,
      (s) => s.street === 'PREFLOP' && s.handNumber === handNum + 1,
      MULTI_HAND_WAIT_MS
    );
    expect(nextHand.handNumber).toBe(handNum + 1);
  } finally {
    p1.disconnect();
    p2.disconnect();
  }
}

async function startJokerSession() {
  const sessionId = `e2e-JOKER-${Date.now()}`;
  const uids = [1, 2, 3, 4].map((n) => `e2e-j${n}-${Date.now()}-${n}`);
  const sockets = uids.map(() => connectClient());

  await Promise.all(sockets.map((s) => new Promise<void>((res) => s.once('connect', () => res()))));

  uids.forEach((uid, i) => {
    sockets[i]!.emit('joinSession', { sessionId, userId: uid, mode: 'JOKER', buyIn: 100 });
  });

  const state = await waitForState(
    sockets[0]!,
    (s) => s.street === 'BIDDING' && s.players.length === 4,
    HAND_WAIT_MS
  );
  return { sessionId, uids, sockets, state };
}

async function playJokerHandToComplete() {
  const { sessionId, uids, sockets, state } = await startJokerSession();
  try {
    const final = await playJokerActionsUntilComplete(sessionId, sockets, uids, state);

    expect(final.mode).toBe('JOKER');
    expect(final.players.length).toBe(4);
    expect(final.joker?.handPoints).toBeDefined();
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
}

async function playJokerHands(handCount: number) {
  const { sessionId, uids, sockets, state } = await startJokerSession();
  try {
    let current = state;

    for (let h = 0; h < handCount; h += 1) {
      current = await playJokerActionsUntilComplete(sessionId, sockets, uids, current);
      expect(current.joker?.handPoints).toBeDefined();
      if (h < handCount - 1) {
        current = await readyAllJokerPlayers(sessionId, sockets, uids, current);
        expect(current.street).not.toBe('COMPLETE');
      }
    }

    return current;
  } finally {
    sockets.forEach((s) => s.disconnect());
  }
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
  test.setTimeout(90_000);
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

  try {
    await Promise.all([
      new Promise<void>((res) => p1.once('connect', () => res())),
      new Promise<void>((res) => p2.once('connect', () => res()))
    ]);

    p1.emit('joinSession', { sessionId, userId: 'hide-p1', mode: 'HOLDEM', buyIn: 100 });
    p2.emit('joinSession', { sessionId, userId: 'hide-p2', mode: 'HOLDEM', buyIn: 100 });

    const state = await waitForState(p1, (s) => s.street === 'PREFLOP');
    expect(state.playerCards['hide-p2']).toEqual([]);
  } finally {
    p1.disconnect();
    p2.disconnect();
  }
});
