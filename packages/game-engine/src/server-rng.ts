import { randomInt } from 'node:crypto';

/** Cryptographically strong seed for live tables (server-only; never sent to clients). */
export const randomSessionSeed = (): number => randomInt(0, 0x1_0000_0000);

/** Uniform delay jitter for bot think time (UX only, not card entropy). */
export const secureRandomMs = (minMs: number, maxMs: number): number => {
  if (maxMs <= minMs) return minMs;
  return minMs + randomInt(0, maxMs - minMs);
};
