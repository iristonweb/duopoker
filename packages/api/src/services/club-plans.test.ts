import { describe, expect, it } from 'vitest';
import { getEffectiveOrganizerTier, isPlanDowngraded } from './billing-lifecycle.js';
import { PLAN_LIMITS } from './club-plans.js';
import { assertPlayMoneySession } from './game-session.js';

describe('club-plans', () => {
  const future = new Date(Date.now() + 86400000);

  it('returns BASIC when plan expired', () => {
    expect(
      getEffectiveOrganizerTier({
        tier: 'PRO',
        status: 'ACTIVE',
        billingStatus: 'ACTIVE',
        expiresAt: new Date(Date.now() - 1000)
      })
    ).toBe('BASIC');
  });

  it('keeps tier during grace', () => {
    expect(
      getEffectiveOrganizerTier({
        tier: 'PRO',
        status: 'ACTIVE',
        billingStatus: 'GRACE',
        expiresAt: new Date(Date.now() - 1000)
      })
    ).toBe('PRO');
  });

  it('detects downgrade', () => {
    expect(
      isPlanDowngraded({
        tier: 'NETWORK',
        status: 'EXPIRED',
        billingStatus: 'PAST_DUE',
        expiresAt: future
      })
    ).toBe(true);
  });

  it('exposes plan limits', () => {
    expect(PLAN_LIMITS.NETWORK.maxMembers).toBe(600);
  });

  it('rejects real-money payload fields', () => {
    expect(() => assertPlayMoneySession({ cashoutAmount: 100 })).toThrow('PLAY_MONEY_ONLY');
    expect(() => assertPlayMoneySession({ sessionId: 'ok', buyIn: 1000 })).not.toThrow();
  });
});
