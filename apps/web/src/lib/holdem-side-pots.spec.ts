import { describe, expect, it } from 'vitest';
import type { SessionState } from '@duopoker/shared-types/index';
import { holdemSidePotAmounts, holdemSidePotSummary, potIndexForChipFlight } from './holdem-side-pots';

const t = (key: string, opts?: Record<string, unknown>) =>
  `${key}:${JSON.stringify(opts ?? {})}`;

const baseSession = (): Pick<
  SessionState,
  'mode' | 'street' | 'players' | 'handContributions' | 'foldedPlayerIds'
> => ({
  mode: 'HOLDEM',
  street: 'COMPLETE',
  players: ['a', 'b', 'c'],
  handContributions: { a: 100, b: 50, c: 50 },
  foldedPlayerIds: []
});

describe('holdemSidePotAmounts', () => {
  it('returns side pot layers during an active hand', () => {
    const amounts = holdemSidePotAmounts({ ...baseSession(), street: 'RIVER' });
    expect(amounts.length).toBeGreaterThan(1);
  });

  it('returns side pot layers when contributions differ', () => {
    const amounts = holdemSidePotAmounts(baseSession());
    expect(amounts.length).toBeGreaterThan(1);
    expect(amounts.reduce((s, n) => s + n, 0)).toBe(200);
  });
});

describe('potIndexForChipFlight', () => {
  it('routes short-stack calls to main pot', () => {
    const idx = potIndexForChipFlight(
      ['a', 'b', 'c'],
      { a: 100, b: 50, c: 50 },
      [],
      'b',
      50
    );
    expect(idx).toBe(0);
  });

  it('routes excess chips above shortest stack to side pot', () => {
    const idx = potIndexForChipFlight(
      ['a', 'b', 'c'],
      { a: 100, b: 50, c: 50 },
      [],
      'a',
      50
    );
    expect(idx).toBe(1);
  });
});

describe('holdemSidePotSummary', () => {
  it('formats multiple pots for overlay copy', () => {
    const line = holdemSidePotSummary(baseSession(), t);
    expect(line).toContain('table.sidePotLine');
    expect(line).toContain('"index":1');
    expect(line).toContain('"index":2');
  });
});
