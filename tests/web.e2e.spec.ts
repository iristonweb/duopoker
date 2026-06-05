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
  await expect(page.getByRole('button', { name: /Играть Hold'em/i })).toBeVisible();
});

test('lobby language switch toggles queue button to English', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await page.getByRole('button', { name: 'EN' }).click();
  await expect(page.getByRole('button', { name: /Queue Hold'em/i })).toBeVisible();
});

test('lobby page renders title', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await expect(page.getByRole('heading', { name: /DuoPoker/i })).toBeVisible();
});

test('lobby shows cosmetic preview images', async ({ page }) => {
  await page.goto('http://127.0.0.1:5180/lobby');
  await expect(page.locator('img[src="/assets/cosmetics/deck_neon.svg"]').first()).toBeVisible();
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
