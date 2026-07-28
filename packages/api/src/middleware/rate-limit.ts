import type { Context, Next } from 'hono';
import { Redis } from '@upstash/redis';

type Bucket = { count: number; resetAt: number };

const localBuckets = new Map<string, Bucket>();

let redis: Redis | null | undefined;

const getRedis = (): Redis | null => {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    redis = new Redis({ url, token });
  } else {
    redis = null;
  }
  return redis;
};

const pruneLocal = (now: number) => {
  if (localBuckets.size < 5000) return;
  for (const [key, bucket] of localBuckets) {
    if (bucket.resetAt <= now) localBuckets.delete(key);
  }
};

const clientIp = (c: Context): string =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
  c.req.header('x-real-ip') ??
  'unknown';

const allowLocal = (key: string, maxRequests: number, windowMs: number): { ok: true } | { ok: false; retryAfter: number } => {
  const now = Date.now();
  pruneLocal(now);
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > maxRequests) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true };
};

const allowRedis = async (
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ ok: true } | { ok: false; retryAfter: number }> => {
  const client = getRedis();
  if (!client) return allowLocal(key, maxRequests, windowMs);

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const count = await client.incr(key);
  if (count === 1) {
    await client.expire(key, windowSec);
  }
  if (count > maxRequests) {
    const ttl = await client.ttl(key);
    return { ok: false, retryAfter: ttl > 0 ? ttl : windowSec };
  }
  return { ok: true };
};

/** Global + per-route rate limit. Uses Upstash when configured; otherwise process-local Map. */
export const rateLimit =
  (maxRequests: number, windowMs: number) => async (c: Context, next: Next) => {
    const key = `rl:${c.req.path}:${clientIp(c)}`;
    const result = await allowRedis(key, maxRequests, windowMs);
    if (!result.ok) {
      c.header('Retry-After', String(result.retryAfter));
      return c.json({ error: 'Too many requests' }, 429);
    }
    await next();
  };
