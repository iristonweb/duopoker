import { randomInt } from 'node:crypto';

/** Cryptographically strong seed for live tables (server-only; never sent to clients). */
export const randomSessionSeed = (): number => randomInt(0, 0x1_0000_0000);
