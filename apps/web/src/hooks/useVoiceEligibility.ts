import { useCallback } from 'react';
import { useVoiceEligibility as useVoiceEligibilityCore, type VoiceEligibility } from '@duopoker/table-client';
import { useAppStore } from '../store/useAppStore';

export type { VoiceEligibility };

export function useVoiceEligibility(): VoiceEligibility {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const fetchStatus = useCallback(
    () => apiFetch('/voice/status').then((r) => (r.ok ? r.json() : null)),
    [apiFetch]
  );
  return useVoiceEligibilityCore(fetchStatus, accessToken, subscriptionTier);
}
