import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await esbuild.build({
  entryPoints: [path.join(root, 'packages/api/src/app.ts')],
  outfile: path.join(root, 'api/_app.js'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
  external: ['@duopoker/db-schema', '@prisma/client'],
  alias: {
    '@duopoker/game-engine/index': path.join(root, 'packages/game-engine/dist/index.js'),
    '@duopoker/shared-types/index': path.join(root, 'packages/shared-types/dist/index.js')
  }
});

console.log('[vercel-api] bundled packages/api → api/_app.js');
