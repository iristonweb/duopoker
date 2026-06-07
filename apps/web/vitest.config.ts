import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  resolve: {
    alias: {
      '@duopoker/shared-types/index': path.join(repoRoot, 'packages/shared-types/src/index.ts'),
      '@duopoker/shared-types': path.join(repoRoot, 'packages/shared-types/src/index.ts'),
      '@duopoker/game-engine': path.join(repoRoot, 'packages/game-engine/src/index.ts')
    }
  },
  test: {
    include: ['src/**/*.spec.ts']
  }
});
