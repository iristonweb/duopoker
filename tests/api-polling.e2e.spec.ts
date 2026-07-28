import { test, expect } from '@playwright/test';

const API = (process.env.E2E_VERCEL_API_URL ?? 'http://127.0.0.1:3001/api').replace(/\/$/, '');
const runPolling =
  Boolean(process.env.E2E_VERCEL_API_URL) || process.env.E2E_API_POLLING === '1';

test.describe('Vercel API smoke', () => {
  test.skip(!runPolling, 'Set E2E_VERCEL_API_URL or E2E_API_POLLING=1 to run API polling smoke tests');

  test('GET /api/health returns ok', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status: string; runtime?: string };
    expect(body.status).toBe('ok');
  });

  test('GET /api/coach/status is public', async ({ request }) => {
    const res = await request.get(`${API}/coach/status`);
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { minTier: string };
    expect(body.minTier).toBe('PLATINUM');
  });
});
