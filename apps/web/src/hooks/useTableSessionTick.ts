import { useEffect } from 'react';
import { NEXT_HAND_DELAY_MS } from '@duopoker/shared-types';
import type { SessionState } from '@duopoker/shared-types/index';
import { useAppStore } from '../store/useAppStore';

/** Nudge server tick when hand-complete timer elapsed (covers lost server timers / missing handCompletedAt). */
export function useTableSessionTick(
  session: SessionState | undefined,
  sessionId: string | undefined
) {
  const apiFetch = useAppStore((s) => s.apiFetch);

  useEffect(() => {
    if (!session || !sessionId || session.street !== 'COMPLETE') return;

    const overdue =
      !session.handCompletedAt || Date.now() - session.handCompletedAt >= NEXT_HAND_DELAY_MS;
    if (!overdue) return;

    const pull = () => {
      void apiFetch(`/game/session/${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { session?: SessionState | null } | null) => {
          if (data?.session) {
            useAppStore.setState({ session: data.session, sessionError: undefined });
          }
        })
        .catch(() => undefined);
    };

    pull();
    const id = setInterval(pull, 1200);
    return () => clearInterval(id);
  }, [session?.street, session?.handCompletedAt, session?.handNumber, sessionId, apiFetch]);
}
