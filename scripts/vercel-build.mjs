#!/usr/bin/env node
import { execSync } from 'node:child_process';

const run = (cmd, opts = {}) => {
  console.log(`> ${cmd}`);
  execSync(cmd, {
    stdio: 'inherit',
    shell: true,
    env: opts.env ?? process.env
  });
};

// Migrations are applied via `pnpm sync:prod-db` / CI release-gate — not during Vercel build.
// Running migrate deploy here races on Neon advisory locks and blocks every frontend deploy.
run('pnpm --filter @duopoker/db-schema build');
run('pnpm --filter @duopoker/shared-types build');
run('pnpm --filter @duopoker/game-engine build');
run('node scripts/bundle-vercel-api.mjs');
// Production (Vercel-only): same-origin /api — never bake localhost VITE_API_URL from dev .env
run('pnpm --filter @duopoker/web build', {
  env: { ...process.env, VITE_API_URL: '' }
});
