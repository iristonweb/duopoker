// Force Vercel file tracer to ship Prisma query engine binaries.
import '../packages/db-schema/src/generated/prisma-client/index.js';
// Bundled at build time by scripts/bundle-vercel-api.mjs (CommonJS)
import app from './_app.js';

export default app;

export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};
