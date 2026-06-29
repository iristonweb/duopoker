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

test.describe('table chat', () => {
  test('player can send and see own chat message on mobile landscape table', async ({
    page,
    request
  }, testInfo) => {
    const health = await request.get(`${API}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    const sessionId = `e2e-chat-${Date.now()}`;
    const userId = `e2e-chat-p1-${Date.now()}`;
    const userId2 = `e2e-chat-p2-${Date.now()}`;

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
      sessionStorage.setItem('duopoker_fullscreen_prompted', '1');
    }, userId);

    await page.goto(`${BASE}/table/${encodeURIComponent(sessionId)}`);
    await expect(page.locator('body')).toHaveAttribute('data-table-layout-mode', 'mobile-classic', {
      timeout: 15_000
    });
    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-chat-hud-button')).toBeVisible({ timeout: 15_000 });

    await page.getByTestId('table-chat-hud-button').click();
    await expect(page.getByTestId('table-chat-drawer')).toBeVisible();

    const message = `hello-${Date.now()}`;
    await page.getByPlaceholder(/Сообщение|Table message/i).fill(message);
    await page.getByRole('button', { name: /Отправить|Send/i }).click();
    await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
  });
});
