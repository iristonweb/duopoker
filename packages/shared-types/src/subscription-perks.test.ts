import { describe, expect, it } from 'vitest';
import {
  PAID_SUBSCRIPTION_TIERS,
  subscriptionCosmeticsForPaidTier
} from './subscription-perks';
import { subscriptionCosmetics } from './cosmetics';

describe('subscriptionCosmeticsForPaidTier', () => {
  it('returns four unique tier-specific items per paid tier', () => {
    for (const tier of PAID_SUBSCRIPTION_TIERS) {
      const items = subscriptionCosmeticsForPaidTier(tier);
      expect(items).toHaveLength(4);
      expect(new Set(items.map((c) => c.id)).size).toBe(4);
      expect(new Set(items.map((c) => c.slot)).size).toBe(4);
      for (const item of items) {
        expect(item.requiredTier).toBe(tier);
        expect(item.id.endsWith(`_${tier.toLowerCase()}`)).toBe(true);
      }
    }
  });

  it('does not repeat the same deck across tiers', () => {
    const decks = PAID_SUBSCRIPTION_TIERS.map(
      (tier) => subscriptionCosmeticsForPaidTier(tier).find((c) => c.slot === 'deck')!.id
    );
    expect(new Set(decks).size).toBe(PAID_SUBSCRIPTION_TIERS.length);
  });

  it('covers deck/chip/frame/title for every paid tier', () => {
    const paidIds = new Set(
      PAID_SUBSCRIPTION_TIERS.flatMap((tier) =>
        subscriptionCosmeticsForPaidTier(tier).map((c) => c.id)
      )
    );
    const catalogPaid = subscriptionCosmetics.filter(
      (c) => c.requiredTier !== 'FREE' && c.slot !== 'table'
    );
    for (const item of catalogPaid) {
      expect(paidIds.has(item.id)).toBe(true);
    }
  });
});
