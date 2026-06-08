import { test, expect } from '@playwright/test';

test.describe('organizer onboarding', () => {
  test('onboarding route loads', async ({ page }) => {
    await page.goto('/clubs/onboarding');
    await expect(page.getByText(/Set up your club/i)).toBeVisible();
  });
});
