import { useCallback } from 'react';
import { useCoachEligibility as useCoachEligibilityCore, type CoachEligibility } from '@duopoker/table-client';
import { useAppStore } from '../store/useAppStore';

export type { CoachEligibility };

export function useCoachEligibility(): CoachEligibility {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const fetchStatus = useCallback(
    () => apiFetch('/coach/status').then((r) => (r.ok ? r.json() : null)),
    [apiFetch]
  );
  return useCoachEligibilityCore(fetchStatus, accessToken, subscriptionTier);
}
