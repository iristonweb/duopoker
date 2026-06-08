import { test, expect } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

const BASE = 'http://127.0.0.1:5180';
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

test.describe('mobile table layout', () => {
  test('lobby fits 375px viewport without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE}/lobby`);
    await expect(page.getByRole('heading', { name: /DP\s*CLUB/i })).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('lobby fits 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/lobby`);
    await expect(page.getByRole('heading', { name: /DP\s*CLUB/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /С людьми/i })).toBeVisible();
  });

  test('table route does not 404 on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const res = await page.goto(`${BASE}/table/smoke-test-session`);
    expect(res?.status()).toBeLessThan(400);
    await expect(page.locator('body')).not.toContainText('404: NOT_FOUND');
  });

  test('landscape lobby renders without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.goto(`${BASE}/lobby`);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('pwa hint can be dismissed on mobile lobby', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript(() => {
      localStorage.removeItem('duopoker-pwa-hint-dismissed');
    });
    await page.goto(`${BASE}/lobby`);
    const hint = page.getByText(/Добавьте на экран|Add to home screen/i);
    await expect(hint).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Понятно|Got it/i }).click();
    await expect(hint).not.toBeVisible();
  });

  test('portrait table hides orientation gate when immersive on', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ orientation: 'portrait' });
    await page.addInitScript(() => {
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
    });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-immersive', {
      timeout: 10_000
    });
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible({ timeout: 10_000 });
  });

  test('portrait table shows rotate overlay when immersive off', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ orientation: 'portrait' });
    await page.addInitScript(() => {
      localStorage.setItem('duopoker_mobile_immersive_table', '0');
    });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.getByTestId('table-orientation-gate')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Поверните телефон|Rotate your phone/i)).toBeVisible();
  });

  test('landscape table route has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.emulateMedia({ orientation: 'landscape' });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test('phone landscape picks classic layout when width exceeds tablet breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ orientation: 'landscape' });
    await page.addInitScript(() => {
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
      sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
    });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-classic', {
      timeout: 10_000
    });
    await expect(page.getByTestId('mobile-immersive-table')).not.toBeVisible();
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
  });

  test('live session renders game table shell on mobile', async ({ page, request }, testInfo) => {
    const health = await request.get(`${API}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    const sessionId = `e2e-mobile-ui-${Date.now()}`;
    const userId = `e2e-mobile-${Date.now()}`;
    const userId2 = `e2e-mobile-p2-${Date.now()}`;

    const p1 = io(API, { transports: ['websocket'] });
    const p2 = io(API, { transports: ['websocket'] });
    await Promise.all([
      new Promise<void>((res) => p1.once('connect', () => res())),
      new Promise<void>((res) => p2.once('connect', () => res()))
    ]);
    p1.emit('joinSession', { sessionId, userId, mode: 'HOLDEM', buyIn: 100 });
    p2.emit('joinSession', { sessionId, userId: userId2, mode: 'HOLDEM', buyIn: 100 });
    try {
      await waitForState(p1, (s) => s.street === 'PREFLOP' && s.players.length === 2, 12_000);
    } catch {
      p1.disconnect();
      p2.disconnect();
      testInfo.skip(true, 'Backend socket unavailable — start full backend on port 4000.');
      return;
    }
    p1.disconnect();
    p2.disconnect();

    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript((uid) => {
      localStorage.setItem('duopoker_user_id', uid);
      localStorage.setItem('duopoker_guest_id', uid);
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
    }, userId);

    await page.goto(`${BASE}/table/${encodeURIComponent(sessionId)}`);
    await expect(page.getByTestId('mobile-immersive-table')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mobile-table-top-bar')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
  });

  test('minimize table shows return banner in lobby', async ({ page, request }, testInfo) => {
    const health = await request.get(`${API}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    const sessionId = `e2e-minimize-${Date.now()}`;
    const userId = `e2e-minimize-${Date.now()}`;
    const userId2 = `e2e-minimize-p2-${Date.now()}`;

    const p1 = io(API, { transports: ['websocket'] });
    const p2 = io(API, { transports: ['websocket'] });
    await Promise.all([
      new Promise<void>((res) => p1.once('connect', () => res())),
      new Promise<void>((res) => p2.once('connect', () => res()))
    ]);
    p1.emit('joinSession', { sessionId, userId, mode: 'HOLDEM', buyIn: 100 });
    p2.emit('joinSession', { sessionId, userId: userId2, mode: 'HOLDEM', buyIn: 100 });
    try {
      await waitForState(p1, (s) => s.street === 'PREFLOP' && s.players.length === 2, 12_000);
    } catch {
      p1.disconnect();
      p2.disconnect();
      testInfo.skip(true, 'Backend socket unavailable — start full backend on port 4000.');
      return;
    }
    p1.disconnect();
    p2.disconnect();

    await page.setViewportSize({ width: 667, height: 375 });
    await page.addInitScript((uid) => {
      localStorage.setItem('duopoker_user_id', uid);
      localStorage.setItem('duopoker_guest_id', uid);
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
      sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
    }, userId);

    await page.goto(`${BASE}/table/${encodeURIComponent(sessionId)}`);
    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Свернуть|Minimize/i }).click();
    await expect(page).toHaveURL(/\/lobby/);
    await expect(page.getByTestId('table-background-banner')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Вернуться|Return/i }).click();
    await expect(page).toHaveURL(new RegExp(`/table/${sessionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
  });
});
