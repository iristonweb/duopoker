import { test, expect } from '@playwright/test';
import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

const BASE = 'http://127.0.0.1:5180';
const API = 'http://localhost:4000';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

async function expectBoxesDoNotOverlap(
  a: import('@playwright/test').Locator,
  b: import('@playwright/test').Locator
) {
  const [boxA, boxB] = await Promise.all([a.boundingBox(), b.boundingBox()]);
  expect(boxA).not.toBeNull();
  expect(boxB).not.toBeNull();
  const overlap =
    boxA!.x < boxB!.x + boxB!.width &&
    boxA!.x + boxA!.width > boxB!.x &&
    boxA!.y < boxB!.y + boxB!.height &&
    boxA!.y + boxA!.height > boxB!.y;
  expect(overlap).toBe(false);
}

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
    await expectNoHorizontalOverflow(page);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 }
  ]) {
    test(`portrait table uses horizontal ring layout at ${viewport.width}x${viewport.height}`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ orientation: 'portrait' });
      await page.addInitScript(() => {
        localStorage.setItem('duopoker_mobile_immersive_table', '1');
        sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
      });
      await page.goto(`${BASE}/table/smoke-test-session`);
      await expect(page.locator('body')).toHaveAttribute(
        'data-table-layout-mode',
        'mobile-classic',
        {
          timeout: 10_000
        }
      );
      await expect(page.getByTestId('table-orientation-gate')).toBeVisible({ timeout: 10_000 });
    });
  }

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

  test('portrait table shows orientation gate for horizontal play', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ orientation: 'portrait' });
    await page.addInitScript(() => {
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
    });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.locator('body')).toHaveAttribute(
      'data-table-layout-mode',
      'mobile-classic',
      {
        timeout: 10_000
      }
    );
    await expect(page.getByTestId('table-orientation-gate')).toBeVisible({ timeout: 10_000 });
  });

  test('portrait table uses classic layout regardless of immersive pref', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ orientation: 'portrait' });
    await page.addInitScript(() => {
      localStorage.setItem('duopoker_mobile_immersive_table', '0');
    });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.locator('body')).toHaveAttribute(
      'data-table-layout-mode',
      'mobile-classic',
      { timeout: 10_000 }
    );
    await expect(page.getByTestId('table-orientation-gate')).toBeVisible({ timeout: 10_000 });
  });

  test('landscape table route has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 });
    await page.emulateMedia({ orientation: 'landscape' });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  for (const viewport of [
    { width: 932, height: 430, label: 'iPhone Pro Max landscape' },
    { width: 640, height: 360, label: 'small Android landscape' },
    { width: 812, height: 375, label: 'iPhone X landscape' }
  ]) {
    test(`${viewport.label} (${viewport.width}x${viewport.height}) shows ring table without gate`, async ({
      page
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ orientation: 'landscape' });
      await page.goto(`${BASE}/table/smoke-test-session`);
      await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-classic', {
        timeout: 10_000
      });
      await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test('iPad portrait uses tablet layout without orientation gate', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.emulateMedia({ orientation: 'portrait' });
    await page.goto(`${BASE}/table/smoke-test-session`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'tablet', {
      timeout: 10_000
    });
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
  });

  test('phone landscape picks classic layout when width exceeds tablet breakpoint', async ({
    page
  }) => {
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

    await page.setViewportSize({ width: 667, height: 375 });
    await page.emulateMedia({ orientation: 'landscape' });
    await page.addInitScript((uid) => {
      localStorage.setItem('duopoker_user_id', uid);
      localStorage.setItem('duopoker_guest_id', uid);
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
      sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
    }, userId);

    await page.goto(`${BASE}/table/${encodeURIComponent(sessionId)}`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-classic', {
      timeout: 15_000
    });
    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-action-dock')).toBeVisible({ timeout: 15_000 });
    // Fold / Check|Call appear when it is the hero's turn after display catch-up.
    await expect(
      page.getByTestId('table-action-check').or(page.getByTestId('table-action-call'))
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('mobile-immersive-table')).not.toBeVisible();
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('live Joker session renders classic dock on mobile landscape', async ({
    page,
    request
  }, testInfo) => {
    const health = await request.get(`${API}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    const sessionId = `e2e-mobile-joker-ui-${Date.now()}`;
    const userIds = [1, 2, 3, 4].map((n) => `e2e-mobile-joker-${Date.now()}-${n}`);
    const sockets = userIds.map(() => io(API, { transports: ['websocket'] }));

    await Promise.all(
      sockets.map((socket) => new Promise<void>((res) => socket.once('connect', () => res())))
    );
    userIds.forEach((uid, i) => {
      sockets[i]!.emit('joinSession', { sessionId, userId: uid, mode: 'JOKER', buyIn: 100 });
    });

    try {
      await waitForState(
        sockets[0]!,
        (s) => s.street === 'BIDDING' && s.players.length === 4,
        12_000
      );
    } catch {
      sockets.forEach((socket) => socket.disconnect());
      testInfo.skip(true, 'Backend Joker socket unavailable — start full backend on port 4000.');
      return;
    }
    sockets.forEach((socket) => socket.disconnect());

    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ orientation: 'landscape' });
    await page.addInitScript((uid) => {
      localStorage.setItem('duopoker_user_id', uid);
      localStorage.setItem('duopoker_guest_id', uid);
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
      sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
    }, userIds[0]);

    await page.goto(`${BASE}/table/${encodeURIComponent(sessionId)}`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-classic', {
      timeout: 15_000
    });
    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-action-dock')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mobile-immersive-table')).not.toBeVisible();
    await expectNoHorizontalOverflow(page);
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
  });

  test('live session renders classic shell and dock in phone landscape', async ({
    page,
    request
  }, testInfo) => {
    const health = await request.get(`${API}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    const sessionId = `e2e-landscape-ui-${Date.now()}`;
    const userId = `e2e-landscape-${Date.now()}`;
    const userId2 = `e2e-landscape-p2-${Date.now()}`;

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

    await page.setViewportSize({ width: 844, height: 390 });
    await page.emulateMedia({ orientation: 'landscape' });
    await page.addInitScript((uid) => {
      localStorage.setItem('duopoker_user_id', uid);
      localStorage.setItem('duopoker_guest_id', uid);
      localStorage.setItem('duopoker_mobile_immersive_table', '1');
      sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
    }, userId);

    await page.goto(`${BASE}/table/${encodeURIComponent(sessionId)}`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-classic', {
      timeout: 15_000
    });
    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-action-dock')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('mobile-immersive-table')).not.toBeVisible();
    await expect(page.getByTestId('table-orientation-gate')).not.toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
