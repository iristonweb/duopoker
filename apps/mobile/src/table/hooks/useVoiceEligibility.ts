import { useEffect, useState } from 'react';
import { tierHasPerk } from '@duopoker/shared-types';
import { apiFetch } from '../../lib/api';
import { useMobileStore } from '../../state/useMobileStore';
import { useTableStore } from '../../state/useTableStore';

export type VoiceEligibility =
  | 'checking'
  | 'ready'
  | 'unavailable'
  | 'sign_in_required'
  | 'tier_required';

type VoiceStatusPayload = {
  livekit?: string;
  minTier?: 'GOLD' | null;
};

export function useVoiceEligibility(subscriptionTier: string): VoiceEligibility {
  const accessToken = useMobileStore((s) => s.accessToken);
  const [status, setStatus] = useState<VoiceEligibility>('checking');

  useEffect(() => {
    let cancelled = false;
    void apiFetch('/voice/status', {}, accessToken)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VoiceStatusPayload | null) => {
        if (cancelled) return;
        if (data?.livekit !== 'configured') {
          setStatus('unavailable');
          return;
        }
        if (!accessToken) {
          setStatus('sign_in_required');
          return;
        }
        if (data.minTier === 'GOLD' && !tierHasPerk(subscriptionTier as never, 'voiceChat')) {
          setStatus('tier_required');
          return;
        }
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, subscriptionTier]);

  return status;
}

export function useVoiceSessionId(): string | undefined {
  return useTableStore((s) => s.session?.sessionId);
}
