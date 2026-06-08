import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5180';

test.describe('organizer onboarding', () => {
  test('onboarding route loads', async ({ page }) => {
    await page.goto(`${BASE}/clubs/onboarding`);
    await expect(page.getByText(/Set up your club/i)).toBeVisible();
  });
});