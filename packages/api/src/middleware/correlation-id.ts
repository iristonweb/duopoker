import type { Context, Next } from 'hono';
import { randomUUID } from 'node:crypto';

export const CORRELATION_HEADER = 'x-correlation-id';

export const correlationId = async (c: Context, next: Next) => {
  const incoming = c.req.header(CORRELATION_HEADER)?.trim();
  const id = incoming || randomUUID();
  c.set('correlationId', id);
  c.header(CORRELATION_HEADER, id);
  await next();
};
