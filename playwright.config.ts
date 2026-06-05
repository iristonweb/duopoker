import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  webServer: {
    command: 'pnpm --filter @duopoker/web exec vite --host 127.0.0.1 --port 5180',
    url: 'http://127.0.0.1:5180/lobby',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
