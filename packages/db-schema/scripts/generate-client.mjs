import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(root, '..');
const maxAttempts = 3;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = spawnSync('pnpm', ['exec', 'prisma', 'generate'], {
    cwd: pkgRoot,
    stdio: 'inherit',
    shell: true
  });

  if (result.status === 0) {
    process.exit(0);
  }

  if (attempt < maxAttempts) {
    console.warn(
      `[db-schema] prisma generate failed (attempt ${attempt}/${maxAttempts}). ` +
        'If EPERM on Windows, stop running backend/dev servers and retry…'
    );
  }
}

console.error(
  '[db-schema] prisma generate failed. On Windows, EPERM usually means a Node process ' +
    '(e.g. `pnpm --filter @duopoker/backend dev`) is locking the query engine. Stop it and rerun build.'
);
process.exit(1);
