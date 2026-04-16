export interface Rng {
  next(): number;
}

export class SeededRng implements Rng {
  private seed: number;

  constructor(seed = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
}
