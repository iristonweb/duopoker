import { useEffect, useState } from 'react';
import { tierHasPerk, type SubscriptionTier } from '@duopoker/shared-types';

export type CoachEligibility =
  | 'checking'
  | 'ready'
  | 'unavailable'
  | 'sign_in_required'
  | 'tier_required';

export type CoachStatusPayload = {
  enabled?: boolean;
  minTier?: 'PLATINUM' | null;
};

export function resolveCoachEligibility(
  data: CoachStatusPayload | null,
  accessToken: string | null,
  subscriptionTier: string
): CoachEligibility {
  if (!data?.enabled) return 'unavailable';
  if (!accessToken) return 'sign_in_required';
  if (data.minTier === 'PLATINUM' && !tierHasPerk(subscriptionTier as SubscriptionTier, 'coach')) {
    return 'tier_required';
  }
  return 'ready';
}

export function useCoachEligibility(
  fetchStatus: () => Promise<CoachStatusPayload | null>,
  accessToken: string | null,
  subscriptionTier: string
): CoachEligibility {
  const [status, setStatus] = useState<CoachEligibility>('checking');

  useEffect(() => {
    let cancelled = false;
    void fetchStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus(resolveCoachEligibility(data, accessToken, subscriptionTier));
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [fetchStatus, accessToken, subscriptionTier]);

  return status;
}
