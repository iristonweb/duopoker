import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(root, '..');
const clientDir = path.join(pkgRoot, 'src', 'generated', 'prisma-client');

const sleep = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const removeWindowsQueryEngineBinaries = () => {
  if (process.platform !== 'win32' || !fs.existsSync(clientDir)) return;
  for (const name of fs.readdirSync(clientDir)) {
    if (!name.includes('query_engine') || !name.endsWith('.node')) continue;
    const full = path.join(clientDir, name);
    try {
      fs.unlinkSync(full);
    } catch {
      try {
        fs.renameSync(full, `${full}.old-${Date.now()}`);
      } catch {
        /* still locked — wasm generate should not need these */
      }
    }
  }
  for (const name of fs.readdirSync(clientDir)) {
    if (!name.endsWith('.old')) continue;
    try {
      fs.unlinkSync(path.join(clientDir, name));
    } catch {
      /* ignore */
    }
  }
};

const runGenerate = () =>
  spawnSync('pnpm', ['exec', 'prisma', 'generate', '--schema', 'prisma/schema.prisma'], {
    cwd: pkgRoot,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PRISMA_CLI_QUERY_ENGINE_TYPE: 'wasm'
    }
  });

removeWindowsQueryEngineBinaries();

let result = runGenerate();

if (result.status !== 0 && process.platform === 'win32') {
  console.warn('[db-schema] generate failed — retrying after cleanup…');
  removeWindowsQueryEngineBinaries();
  sleep(1500);
  result = runGenerate();
}

if (result.status === 0) {
  removeWindowsQueryEngineBinaries();
  process.exit(0);
}

console.error(
  '[db-schema] prisma generate failed.\n' +
    'Your database may still be synced if you ran db:push (check for "in sync" above).\n' +
    '1) Stop dev servers (backend :4000, web :5180) and close extra terminals\n' +
    '2) Retry: pnpm --filter @duopoker/db-schema generate\n' +
    '3) Or restart Cursor and retry'
);
process.exit(result.status ?? 1);
