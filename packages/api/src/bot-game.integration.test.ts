import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import app from './app.js';

const hasDb = Boolean(process.env.DATABASE_URL);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const jsonFetch = async (path: string, init: RequestInit = {}, token?: string) => {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await app.fetch(new Request(`http://localhost/api${path}`, { ...init, headers }));
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
};

const maxRoundBet = (s: SessionState) =>
  s.players.reduce((m, p) => Math.max(m, s.playerRoundBet[p] ?? 0), 0);

const handFinished = (s: SessionState | null): boolean =>
  Boolean(s && (s.street === 'COMPLETE' || (s.street === 'SHOWDOWN' && (s.winners?.length ?? 0) > 0)));

describe.skipIf(!hasDb)('bot Holdem hand (REST)', () => {
  it('queues vs bot and finishes one hand', async () => {
    process.env.ALLOW_SOLO_QUEUE = 'true';

    const email = `bot-test-${Date.now()}@example.com`;
    const reg = await jsonFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'testpass123',
        displayName: 'Bot Tester',
        nickname: `bot_${Date.now().toString(36).slice(-6)}`
      })
    });
    expect(reg.res.status).toBe(201);
    const token = (reg.data as { accessToken: string }).accessToken;
    const userId = (reg.data as { user: { id: string } }).user.id;

    const queue = await jsonFetch(
      '/game/queue',
      {
        method: 'POST',
        body: JSON.stringify({ mode: 'HOLDEM', buyIn: 100, opponent: 'bot', playerCount: 2 })
      },
      token
    );
    expect(queue.res.status).toBe(200);
    const sessionId = (queue.data as { sessionId?: string }).sessionId;
    expect(sessionId).toBeTruthy();

    let session: SessionState | null = null;

    for (let guard = 0; guard < 120; guard += 1) {
      const snap = await jsonFetch(`/game/session/${sessionId}`, {}, token);
      expect(snap.res.status).toBe(200);
      session = (snap.data as { session: SessionState }).session;
      if (handFinished(session)) break;

      const actor = session.players[session.activePlayerIndex]!;
      if (actor !== userId) {
        await sleep(50);
        continue;
      }

      const need = maxRoundBet(session) - (session.playerRoundBet[actor] ?? 0);
      const action = need === 0 ? 'check' : 'call';

      await jsonFetch(
        '/game/action',
        {
          method: 'POST',
          body: JSON.stringify({ sessionId, type: action, at: Date.now() })
        },
        token
      );

      await sleep(50);
    }

    expect(handFinished(session)).toBe(true);
    expect(session?.winners?.length).toBeGreaterThan(0);
  }, 90_000);
});
