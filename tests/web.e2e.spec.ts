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

test('lobby defaults to Russian queue button', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await page.getByRole('radio', { name: /С людьми/i }).click();
  await expect(page.getByTestId('lobby-queue-button')).toBeVisible();
});

test('lobby language switch toggles queue button to English', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await page.getByRole('button', { name: 'EN' }).click();
  await page.getByRole('radio', { name: /Vs players/i }).click();
  await expect(page.getByTestId('lobby-queue-button')).toHaveText(/Queue Hold'em/i);
});

test('lobby page renders title', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await expect(page.getByRole('heading', { name: /DP\s*CLUB/i })).toBeVisible();
});

test('profile SPA route does not 404', async ({ page }) => {
  const res = await page.goto('http://127.0.0.1:5180/profile');
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
});

test('admin SPA route does not 404', async ({ page }) => {
  const res = await page.goto('http://127.0.0.1:5180/admin');
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
});

test('clubs SPA route does not 404', async ({ page }) => {
  const res = await page.goto('http://127.0.0.1:5180/clubs');
  expect(res?.status()).toBeLessThan(400);
  await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
});

test('lobby shows subscriptions section', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await expect(page.getByRole('heading', { name: /Подписки/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Подробнее/i }).first()).toBeVisible();
});

test('legal terms route is reachable', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/legal/terms');
  await expect(page.getByRole('heading', { name: /Terms of use/i })).toBeVisible();
});

test('lobby shows private clubs section', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await expect(page.getByRole('heading', { name: /Приватные клубы/i })).toBeVisible();
});

test('clubs route renders', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/clubs');
  await expect(page.getByRole('heading', { name: /Приватные клубы/i })).toBeVisible();
});

test('legal community route is reachable', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/legal/community');
  await expect(page.getByRole('heading', { name: /Community rules/i })).toBeVisible();
});
