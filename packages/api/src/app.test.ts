import { describe, expect, it } from 'vitest';
import app from './app.js';

describe('API smoke', () => {
  it('GET /api/health returns ok', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('GET /api/notifications/vapid-public-key requires auth', async () => {
    const res = await app.fetch(new Request('http://localhost/api/notifications/vapid-public-key'));
    expect(res.status).toBe(401);
  });
});
