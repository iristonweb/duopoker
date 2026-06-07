import { useEffect, useState } from 'react';
import { tierHasPerk } from '@duopoker/shared-types';
import { useAppStore } from '../store/useAppStore';

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

export function useVoiceEligibility(): VoiceEligibility {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const [status, setStatus] = useState<VoiceEligibility>('checking');

  useEffect(() => {
    let cancelled = false;
    void apiFetch('/voice/status')
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
        if (data.minTier === 'GOLD' && !tierHasPerk(subscriptionTier, 'voiceChat')) {
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
  }, [apiFetch, accessToken, subscriptionTier]);

  return status;
}
