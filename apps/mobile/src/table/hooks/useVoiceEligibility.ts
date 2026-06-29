import { useCallback } from 'react';
import { useVoiceEligibility as useVoiceEligibilityCore, type VoiceEligibility } from '@duopoker/table-client';
import { apiFetch } from '../../lib/api';
import { useMobileStore } from '../../state/useMobileStore';
import { useTableStore } from '../../state/useTableStore';

export type { VoiceEligibility };

export function useVoiceEligibility(subscriptionTier: string): VoiceEligibility {
  const accessToken = useMobileStore((s) => s.accessToken);
  const fetchStatus = useCallback(
    () => apiFetch('/voice/status', {}, accessToken).then((r) => (r.ok ? r.json() : null)),
    [accessToken]
  );
  return useVoiceEligibilityCore(fetchStatus, accessToken, subscriptionTier);
}

export function useVoiceSessionId(): string | undefined {
  return useTableStore((s) => s.session?.sessionId);
}
