import { handle } from 'hono/vercel';
// Bundled at build time by scripts/bundle-vercel-api.mjs
import app from './_app.mjs';

export default handle(app);

export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};
