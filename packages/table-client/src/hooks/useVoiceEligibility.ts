import { useEffect, useState } from 'react';
import { tierHasPerk, type SubscriptionTier } from '@duopoker/shared-types';

export type VoiceEligibility =
  | 'checking'
  | 'ready'
  | 'unavailable'
  | 'sign_in_required'
  | 'tier_required';

export type VoiceStatusPayload = {
  livekit?: string;
  minTier?: 'GOLD' | null;
};

export function resolveVoiceEligibility(
  data: VoiceStatusPayload | null,
  accessToken: string | null,
  subscriptionTier: string
): VoiceEligibility {
  if (!data || data.livekit !== 'configured') return 'unavailable';
  if (!accessToken) return 'sign_in_required';
  if (data.minTier === 'GOLD' && !tierHasPerk(subscriptionTier as SubscriptionTier, 'voiceChat')) {
    return 'tier_required';
  }
  return 'ready';
}

export function useVoiceEligibility(
  fetchStatus: () => Promise<VoiceStatusPayload | null>,
  accessToken: string | null,
  subscriptionTier: string
): VoiceEligibility {
  const [status, setStatus] = useState<VoiceEligibility>('checking');

  useEffect(() => {
    let cancelled = false;
    void fetchStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus(resolveVoiceEligibility(data, accessToken, subscriptionTier));
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
