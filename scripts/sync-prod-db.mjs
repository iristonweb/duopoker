/**
 * Sync production DB after squashed init migration + grant missing subscription cosmetics.
 *
 * For DBs created via db:push (schema already matches): marks init migration applied, then backfills.
 * For empty DBs: migrate deploy creates schema, then backfills.
 *
 * Usage:
 *   pnpm sync:prod-db              # apply
 *   pnpm sync:prod-db -- --dry-run # backfill preview only (still resolves migration if needed)
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDbEnv } from './load-db-env.mjs';

loadDbEnv({ override: true });

const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host;
  } catch {
    return 'unknown';
  }
})();
console.log(`→ target database: ${dbHost}`);

const dryRun = process.argv.includes('--dry-run');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaDir = join(root, 'packages/db-schema');
const initMigration = '20260401000000_init';

const run = (cmd, args, opts = {}) => {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: process.env,
    stdio: 'pipe'
  });
  return result;
};

console.log('→ prisma migrate deploy');
let deploy = run('pnpm', [
  'exec',
  'prisma',
  'migrate',
  'deploy',
  '--schema',
  'prisma/schema.prisma'
], { cwd: schemaDir });

if (deploy.status !== 0) {
  const out = `${deploy.stdout ?? ''}${deploy.stderr ?? ''}`;
  if (out.includes('P3005') || out.includes('P3018') || out.includes('already exists')) {
    console.log(`→ marking ${initMigration} as applied (existing schema)`);
    const resolve = run('pnpm', [
      'exec',
      'prisma',
      'migrate',
      'resolve',
      '--applied',
      initMigration,
      '--schema',
      'prisma/schema.prisma'
    ], { cwd: schemaDir });
    if (resolve.status !== 0) {
      console.error(resolve.stdout ?? resolve.stderr);
      process.exit(resolve.status ?? 1);
    }
    deploy = run('pnpm', [
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma'
    ], { cwd: schemaDir });
  }
}

if (deploy.status !== 0) {
  console.error(deploy.stdout ?? deploy.stderr);
  process.exit(deploy.status ?? 1);
}

console.log(deploy.stdout?.trim() || 'Migrations up to date.');

console.log(`→ subscription cosmetics backfill${dryRun ? ' (dry-run)' : ''}`);
const backfillArgs = ['scripts/backfill-subscription-cosmetics.mjs'];
if (dryRun) backfillArgs.push('--dry-run');
const backfill = run('node', backfillArgs);
process.stdout.write(backfill.stdout ?? '');
process.stderr.write(backfill.stderr ?? '');
process.exit(backfill.status ?? 0);
