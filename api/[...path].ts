import { handle } from 'hono/vercel';
import app from '../packages/api/src/app';

export default handle(app);

export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};
