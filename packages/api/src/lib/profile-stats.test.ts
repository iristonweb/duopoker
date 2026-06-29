import { describe, expect, it } from 'vitest';
import { canAccessGameStats } from './profile-stats.js';

describe('canAccessGameStats', () => {
  it('denies FREE and PLATINUM tiers', () => {
    expect(canAccessGameStats('FREE')).toBe(false);
    expect(canAccessGameStats('PLATINUM')).toBe(false);
  });

  it('allows BLACK tier', () => {
    expect(canAccessGameStats('BLACK')).toBe(true);
  });
});
