import { describe, expect, it } from 'vitest';
import { describeHoldemStrength, holdemShowdownHandLines } from './holdem-hand-rank';

const t = (key: string, opts?: Record<string, unknown>) => {
  if (opts) return `${key}:${JSON.stringify(opts)}`;
  return key;
};

describe('describeHoldemStrength', () => {
  it('labels a pair hand', () => {
    const label = describeHoldemStrength([1, 12] as const, t);
    expect(label).toBe('table.holdemPair');
  });

  it('includes high card for straight', () => {
    const label = describeHoldemStrength([4, 12] as const, t);
    expect(label).toContain('table.holdemStraightHigh');
  });
});

describe('holdemShowdownHandLines', () => {
  it('builds winner lines at complete street', () => {
    const line = holdemShowdownHandLines(
      {
        mode: 'HOLDEM',
        street: 'COMPLETE',
        winners: ['hero'],
        foldedPlayerIds: [],
        communityCards: ['AS', 'KH', 'QD', 'JC', '9H'],
        playerCards: { hero: ['TS', '8S'], villain: ['2D', '3D'] }
      },
      (uid) => (uid === 'hero' ? 'Hero' : uid),
      t
    );
    expect(line).toContain('table.holdemWinnerHand');
    expect(line).toContain('Hero');
  });
});
