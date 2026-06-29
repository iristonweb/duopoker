const actionCounters = new Map<string, { second: number; count: number }>();

export const RATE_LIMIT_PER_SECOND = 20;

export const canAcceptPlayerAction = (userId: string, now = Date.now()): boolean => {
  const currentSecond = Math.floor(now / 1000);
  const bucket = actionCounters.get(userId);
  if (!bucket || bucket.second !== currentSecond) {
    actionCounters.set(userId, { second: currentSecond, count: 1 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_SECOND) return false;
  bucket.count += 1;
  return true;
};

/** Prune stale rate-limit buckets (call periodically in long-lived servers). */
export const pruneActionRateLimitBuckets = (now = Date.now()): void => {
  const currentSecond = Math.floor(now / 1000);
  for (const [userId, bucket] of actionCounters) {
    if (bucket.second < currentSecond - 2) {
      actionCounters.delete(userId);
    }
  }
};
