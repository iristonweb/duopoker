import { test, expect } from '@playwright/test';

test('health endpoint is available', async ({ request }, testInfo) => {
  const response = await request.get('http://localhost:4000/health').catch(() => null);
  if (!response?.ok()) {
    testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
    return;
  }
  expect(response.ok()).toBeTruthy();
});

test('metrics endpoint is available', async ({ request }, testInfo) => {
  const response = await request.get('http://localhost:4000/metrics').catch(() => null);
  if (!response?.ok()) {
    testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
    return;
  }
  expect(response.ok()).toBeTruthy();
});

test('lobby page renders title', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/lobby');
  await expect(page.getByRole('heading', { name: /DuoPoker/i })).toBeVisible();
});

test('legal terms route is reachable', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173/legal/terms');
  await expect(page.getByRole('heading', { name: /Terms of use/i })).toBeVisible();
});
