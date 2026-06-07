import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import { JOKER_RECOMMENDED_PLAYERS } from '@duopoker/shared-types/index';
import app from './app.js';

const hasDb = Boolean(process.env.DATABASE_URL);

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

describe.skipIf(!hasDb)('Joker queue contract (REST)', () => {
  it('seats 4 players and persists jokerRules on session', async () => {
    process.env.ALLOW_SOLO_QUEUE = 'true';

    const email = `joker-rules-${Date.now()}@example.com`;
    const reg = await jsonFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'testpass123',
        displayName: 'Joker Rules Tester',
        nickname: `jr_${Date.now().toString(36).slice(-6)}`
      })
    });
    expect(reg.res.status).toBe(201);
    const token = (reg.data as { accessToken: string }).accessToken;

    const queue = await jsonFetch(
      '/game/queue',
      {
        method: 'POST',
        body: JSON.stringify({
          mode: 'JOKER',
          buyIn: 100,
          opponent: 'bot',
          playerCount: 2,
          jokerRules: { strictJoker: true, scoringMode: 'minus' }
        })
      },
      token
    );
    expect(queue.res.status).toBe(200);
    const sessionId = (queue.data as { sessionId?: string }).sessionId;
    expect(sessionId).toBeTruthy();

    const snap = await jsonFetch(`/game/session/${sessionId}`, {}, token);
    expect(snap.res.status).toBe(200);
    const session = (snap.data as { session: SessionState }).session;

    expect(session.mode).toBe('JOKER');
    expect(session.players.length).toBe(JOKER_RECOMMENDED_PLAYERS);
    expect(session.jokerRules?.strictJoker).toBe(true);
    expect(session.jokerRules?.scoringMode).toBe('minus');
  });

  it('accepts legacy RASPISNOY mode alias in queue payload', async () => {
    process.env.ALLOW_SOLO_QUEUE = 'true';

    const email = `raspisnoy-${Date.now()}@example.com`;
    const reg = await jsonFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: 'testpass123',
        displayName: 'Legacy Mode',
        nickname: `rs_${Date.now().toString(36).slice(-6)}`
      })
    });
    expect(reg.res.status).toBe(201);
    const token = (reg.data as { accessToken: string }).accessToken;

    const queue = await jsonFetch(
      '/game/queue',
      {
        method: 'POST',
        body: JSON.stringify({
          mode: 'RASPISNOY',
          buyIn: 100,
          opponent: 'bot'
        })
      },
      token
    );
    expect(queue.res.status).toBe(200);
    const sessionId = (queue.data as { sessionId?: string }).sessionId;
    expect(sessionId).toBeTruthy();

    const snap = await jsonFetch(`/game/session/${sessionId}`, {}, token);
    const session = (snap.data as { session: SessionState }).session;
    expect(session.mode).toBe('JOKER');
    expect(session.players.length).toBe(JOKER_RECOMMENDED_PLAYERS);
  });
});
