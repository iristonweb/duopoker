import { defineConfig, devices } from '@playwright/test';

const webServer = process.env.CI
  ? [
      {
        command:
          'pnpm --filter @duopoker/backend exec tsx src/main.ts',
        url: 'http://127.0.0.1:4000/health',
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          PORT: '4000',
          DATABASE_URL: process.env.DATABASE_URL ?? '',
          DIRECT_DATABASE_URL:
            process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
          ALLOW_OPEN_JOIN: 'true',
          ALLOW_SOLO_QUEUE: 'true',
          JWT_SECRET: 'ci-jwt-secret-minimum-32-characters-long',
          JWT_REFRESH_SECRET: 'ci-jwt-refresh-secret-min-32-chars-long'
        }
      },
      {
        command: 'pnpm --filter @duopoker/web exec vite --host 127.0.0.1 --port 5180',
        url: 'http://127.0.0.1:5180/lobby',
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          VITE_API_URL: 'http://127.0.0.1:4000',
          VITE_API_PROXY: 'http://127.0.0.1:4000'
        }
      }
    ]
  : {
      command: 'pnpm --filter @duopoker/web exec vite --host 127.0.0.1 --port 5180',
      url: 'http://127.0.0.1:5180/lobby',
      reuseExistingServer: true,
      timeout: 120_000
    };

const tableMobileSmoke = /table-mobile\.e2e\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off'
  },
  projects: process.env.CI
    ? [
        { name: 'Google Chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12 Landscape'] },
          testMatch: tableMobileSmoke
        }
      ]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12 Landscape'] },
          testMatch: tableMobileSmoke
        }
      ],
  webServer
});
