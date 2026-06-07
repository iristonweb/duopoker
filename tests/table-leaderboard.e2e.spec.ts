import { test, expect } from '@playwright/test';
import {
  createHoldemTableSession,
  E2E_API_BASE,
  openTableAsHero
} from './helpers/table-session';

test.describe('table leaderboard UI', () => {
  test('mobile viewport opens leaderboard sheet from FAB', async ({ page, request }, testInfo) => {
    const health = await request.get(`${E2E_API_BASE}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    let session;
    try {
      session = await createHoldemTableSession();
    } catch {
      testInfo.skip(true, 'Backend socket unavailable — start full backend on port 4000.');
      return;
    }

    await page.setViewportSize({ width: 375, height: 667 });
    await openTableAsHero(page, session.sessionId, session.userId);

    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-top-hud')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('leaderboard-podium')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('table-leaderboard-fab')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('table-leaderboard-fab').click();
    await expect(page.getByTestId('table-leaderboard-sheet')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('leaderboard-row')).toHaveCount(2);
  });

  test('desktop viewport opens leaderboard panel from HUD trophy', async ({ page, request }, testInfo) => {
    const health = await request.get(`${E2E_API_BASE}/health`).catch(() => null);
    if (!health?.ok()) {
      testInfo.skip(true, 'Start backend on port 4000 (see docs/DEPLOY.md).');
      return;
    }

    let session;
    try {
      session = await createHoldemTableSession();
    } catch {
      testInfo.skip(true, 'Backend socket unavailable — start full backend on port 4000.');
      return;
    }

    await page.setViewportSize({ width: 1280, height: 720 });
    await openTableAsHero(page, session.sessionId, session.userId);

    await expect(page.getByTestId('game-table-shell')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('table-top-hud')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('leaderboard-podium')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Открыть таблицу лидеров|Open leaderboard/i }).click();
    await expect(page.getByTestId('table-leaderboard-panel')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('leaderboard-row')).toHaveCount(2);
  });
});
