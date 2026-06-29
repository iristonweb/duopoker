import { describe, expect, it } from 'vitest';
import { resolveCoachEligibility } from './useCoachEligibility.js';

describe('resolveCoachEligibility', () => {
  it('requires sign-in and platinum perk', () => {
    expect(resolveCoachEligibility({ enabled: true, minTier: 'PLATINUM' }, null, 'FREE')).toBe(
      'sign_in_required'
    );
    expect(
      resolveCoachEligibility({ enabled: true, minTier: 'PLATINUM' }, 'tok', 'GOLD')
    ).toBe('tier_required');
    expect(
      resolveCoachEligibility({ enabled: true, minTier: 'PLATINUM' }, 'tok', 'PLATINUM')
    ).toBe('ready');
  });
});
