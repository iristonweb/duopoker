export interface Rng {
  next(): number;
}

export class SeededRng implements Rng {
  private seed: number;

  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  /** Deterministic integer in [0, max) for bot decisions tied to session entropy. */
  nextInt(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.next() * max);
  }
}
