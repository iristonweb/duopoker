#!/usr/bin/env node
import { execSync } from 'node:child_process';

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const run = (cmd, env = process.env) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, env });
};

const resolveDirectDatabaseUrl = () => {
  const explicit = process.env.DIRECT_DATABASE_URL?.trim();
  if (explicit) return explicit;
  const pooled = process.env.DATABASE_URL?.trim();
  if (!pooled) return pooled;
  // Neon pooler host: ep-xxx-pooler.region.aws.neon.tech → direct: ep-xxx.region.aws.neon.tech
  return pooled.replace('-pooler', '');
};

const migrateDeploy = (env) => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      run(
        'pnpm --filter @duopoker/db-schema exec prisma migrate deploy --schema prisma/schema.prisma',
        env
      );
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const waitMs = attempt * 5000;
      console.warn(`[vercel-build] migrate attempt ${attempt} failed, retry in ${waitMs}ms…`);
      sleep(waitMs);
    }
  }
};

const directUrl = resolveDirectDatabaseUrl();
const buildEnv = {
  ...process.env,
  DIRECT_DATABASE_URL: directUrl || process.env.DATABASE_URL
};

run('pnpm --filter @duopoker/db-schema build', buildEnv);
migrateDeploy(buildEnv);
run('pnpm --filter @duopoker/shared-types build', buildEnv);
run('pnpm --filter @duopoker/game-engine build', buildEnv);
run('node scripts/bundle-vercel-api.mjs', buildEnv);
run('pnpm --filter @duopoker/web build', buildEnv);
