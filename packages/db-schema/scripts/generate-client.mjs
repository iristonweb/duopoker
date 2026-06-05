import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(root, '..');
const clientDir = path.join(pkgRoot, 'src', 'generated', 'prisma-client');

const cleanStaleWindowsBinaries = () => {
  if (process.platform !== 'win32' || !fs.existsSync(clientDir)) return;
  for (const name of fs.readdirSync(clientDir)) {
    if (!name.startsWith('query_engine-windows.dll.node')) continue;
    const full = path.join(clientDir, name);
    try {
      fs.unlinkSync(full);
    } catch {
      /* locked — wasm generate no longer needs these */
    }
  }
};

const runGenerate = () =>
  spawnSync('pnpm', ['exec', 'prisma', 'generate'], {
    cwd: pkgRoot,
    stdio: 'inherit',
    shell: true
  });

cleanStaleWindowsBinaries();

const result = runGenerate();

if (result.status === 0) {
  process.exit(0);
}

console.error(
  '[db-schema] prisma generate failed.\n' +
    '1) Stop all dev servers (backend :4000, web :5180)\n' +
    '2) Close extra Cursor terminals\n' +
    '3) Retry: pnpm --filter @duopoker/db-schema generate\n' +
    'Schema uses engineType=wasm — no .dll.node should be required after a clean generate.'
);
process.exit(result.status ?? 1);
