import { describe, expect, it } from 'vitest';
import {
  resolveRevenueCatProduct,
  revenueCatEventClaimId,
  revenueCatProviderForStore
} from './revenuecat-catalog.js';

describe('revenuecat-catalog', () => {
  it('maps chip packs and tiers', () => {
    expect(resolveRevenueCatProduct('duopoker.chips.2500')?.itemId).toBe('chips_2500');
    expect(resolveRevenueCatProduct('duopoker.tier.gold')?.tier).toBe('GOLD');
    expect(resolveRevenueCatProduct('unknown.product')).toBeNull();
  });

  it('selects store provider', () => {
    expect(revenueCatProviderForStore('PLAY_STORE')).toBe('google_play');
    expect(revenueCatProviderForStore('APP_STORE')).toBe('apple_iap');
  });

  it('builds dedup claim ids', () => {
    expect(revenueCatEventClaimId('evt_123')).toBe('revenuecat:event:evt_123');
  });
});
