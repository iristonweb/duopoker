import { useMemo } from 'react';
import { useTableSessionTick as useTableSessionTickBase } from '@duopoker/table-client';
import type { SessionState } from '@duopoker/shared-types/index';
import { usesRealtimeSocket } from '../config/api';
import { useAppStore } from '../store/useAppStore';

/** Nudge server tick when hand-complete timer elapsed or a bot turn appears stuck. */
export function useTableSessionTick(
  session: SessionState | undefined,
  sessionId: string | undefined
) {
  const apiFetch = useAppStore((s) => s.apiFetch);

  const deps = useMemo(
    () => ({
      apiFetch,
      usesRealtimeSocket,
      reconnectSession: (sid: string) => {
        if (usesRealtimeSocket()) {
          useAppStore.getState().socket?.emit('reconnectSession', { sessionId: sid });
          return;
        }
        void apiFetch(`/game/session/${encodeURIComponent(sid)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { session?: SessionState | null } | null) => {
            if (data?.session) {
              useAppStore.setState({ session: data.session, sessionError: undefined });
            }
          })
          .catch(() => undefined);
      },
      setSession: (s: SessionState) => {
        useAppStore.setState({ session: s, sessionError: undefined });
      }
    }),
    [apiFetch]
  );

  useTableSessionTickBase(session, sessionId, deps);
}
