export interface Rng {
  next(): number;
  /** Uniform integer in [0, max) without modulo bias when implemented. */
  nextInt(max: number): number;
}

export class SeededRng implements Rng {
  private seed: number;

  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x1_0000_0000;
  }

  /** Rejection sampling — unbiased index for Fisher–Yates shuffles. */
  nextInt(max: number): number {
    if (max <= 0) return 0;
    if (max > 0x1_0000_0000) max = 0x1_0000_0000;
    const limit = (0x1_0000_0000 - (0x1_0000_0000 % max)) >>> 0;
    if (limit === 0) return 0;
    let x = this.seed;
    do {
      this.seed = (1664525 * this.seed + 1013904223) >>> 0;
      x = this.seed;
    } while (x >= limit);
    return x % max;
  }
}

/** Stir session + hand counter into a 32-bit deal seed (deterministic, high diffusion). */
export const mixHandSeed = (sessionSeed: number, handNumber: number): number => {
  let h = (sessionSeed ^ Math.imul(handNumber + 1, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};
