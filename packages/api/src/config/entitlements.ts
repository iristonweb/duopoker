import type { OrganizerPlanTier } from '@duopoker/shared-types';
import { PLAN_LIMITS } from '../services/club-plans.js';

export type OrganizerEntitlements = {
  maxMembers: number;
  maxActiveTables: number;
  customBranding: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  apiAccess: boolean;
};

const FEATURE_FLAGS: Record<OrganizerPlanTier, Omit<OrganizerEntitlements, 'maxMembers' | 'maxActiveTables'>> = {
  BASIC: {
    customBranding: false,
    analytics: false,
    prioritySupport: false,
    apiAccess: false
  },
  PRO: {
    customBranding: true,
    analytics: true,
    prioritySupport: false,
    apiAccess: false
  },
  NETWORK: {
    customBranding: true,
    analytics: true,
    prioritySupport: true,
    apiAccess: true
  }
};

export const entitlementsForTier = (tier: OrganizerPlanTier): OrganizerEntitlements => ({
  ...PLAN_LIMITS[tier],
  ...FEATURE_FLAGS[tier]
});

export const ENTITLEMENT_MATRIX = {
  BASIC: entitlementsForTier('BASIC'),
  PRO: entitlementsForTier('PRO'),
  NETWORK: entitlementsForTier('NETWORK')
} as const;
