import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 90_000,
    hookTimeout: 30_000
  }
});
