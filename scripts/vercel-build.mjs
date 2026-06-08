#!/usr/bin/env node
import { execSync } from 'node:child_process';

const steps = [
  'pnpm --filter @duopoker/db-schema build',
  'pnpm --filter @duopoker/db-schema exec prisma migrate deploy --schema prisma/schema.prisma',
  'pnpm --filter @duopoker/shared-types build',
  'pnpm --filter @duopoker/game-engine build',
  'node scripts/bundle-vercel-api.mjs',
  'pnpm --filter @duopoker/web build'
];

for (const cmd of steps) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}
