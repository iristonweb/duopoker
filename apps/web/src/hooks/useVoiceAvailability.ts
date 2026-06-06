import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export type VoiceAvailability = 'checking' | 'available' | 'unavailable';

export function useVoiceAvailability(): VoiceAvailability {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const [status, setStatus] = useState<VoiceAvailability>('checking');

  useEffect(() => {
    let cancelled = false;
    void apiFetch('/voice/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { livekit?: string } | null) => {
        if (cancelled) return;
        setStatus(data?.livekit === 'configured' ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  return status;
}
