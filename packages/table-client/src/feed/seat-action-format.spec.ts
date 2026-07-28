import { describe, expect, it } from 'vitest';
import { formatSeatActionShort } from './seat-action-format';

const t = (key: string, opts?: Record<string, unknown>) => {
  if (key === 'table.actionChooseTrump') return `TRUMP ${opts?.suit ?? ''}`;
  if (key === 'table.actionChooseNoTrump') return 'NO TRUMP';
  if (key === 'table.actionCheck') return 'CHECK';
  return key;
};

describe('formatSeatActionShort', () => {
  it('maps chooseTrump to trump kind', () => {
    const withSuit = formatSeatActionShort(
      { sessionId: 's1', type: 'chooseTrump', userId: 'a', trumpSuit: 'H', at: 1 },
      t
    );
    expect(withSuit.kind).toBe('trump');
    expect(withSuit.label).toContain('♥');

    const noTrump = formatSeatActionShort(
      { sessionId: 's1', type: 'chooseTrump', userId: 'a', trumpSuit: null, at: 1 },
      t
    );
    expect(noTrump.kind).toBe('trump');
    expect(noTrump.label).toBe('NO TRUMP');
  });

  it('keeps check distinct from trump', () => {
    const check = formatSeatActionShort({ sessionId: 's1', type: 'check', userId: 'a', at: 1 }, t);
    expect(check.kind).toBe('check');
  });
});
