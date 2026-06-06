import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off'
  },
  // CI uses system Chrome — avoids ~170MB Chromium download that hangs on GitHub runners.
  projects: process.env.CI
    ? [{ name: 'Google Chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }]
    : undefined,
  webServer: {
    command: 'pnpm --filter @duopoker/web exec vite --host 127.0.0.1 --port 5180',
    url: 'http://127.0.0.1:5180/lobby',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
