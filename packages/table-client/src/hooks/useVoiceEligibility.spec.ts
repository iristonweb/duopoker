import { describe, expect, it } from 'vitest';
import { resolveVoiceEligibility } from './useVoiceEligibility.js';

describe('resolveVoiceEligibility', () => {
  it('requires gold tier when configured', () => {
    expect(resolveVoiceEligibility({ livekit: 'configured', minTier: 'GOLD' }, 'tok', 'FREE')).toBe(
      'tier_required'
    );
    expect(resolveVoiceEligibility({ livekit: 'configured', minTier: 'GOLD' }, 'tok', 'GOLD')).toBe(
      'ready'
    );
  });

  it('is unavailable when livekit missing', () => {
    expect(resolveVoiceEligibility({ livekit: 'missing' }, 'tok', 'GOLD')).toBe('unavailable');
  });
});
