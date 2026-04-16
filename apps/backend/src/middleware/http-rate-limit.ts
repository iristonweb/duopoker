import type { NextFunction, Request, Response } from 'express';

const buckets = new Map<string, { second: number; count: number }>();
const LIMIT = 60;

export const httpRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const key = req.ip ?? 'unknown';
  const second = Math.floor(Date.now() / 1000);
  const bucket = buckets.get(key);
  if (!bucket || bucket.second !== second) {
    buckets.set(key, { second, count: 1 });
    return next();
  }
  if (bucket.count >= LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  bucket.count += 1;
  return next();
};
