import { tierHasPerk, type SubscriptionTier } from '@duopoker/shared-types';

export const canAccessGameStats = (tier: SubscriptionTier): boolean =>
  tierHasPerk(tier, 'apiStats');
