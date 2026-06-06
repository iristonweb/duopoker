import { useEffect, useRef } from 'react';
import { NEXT_HAND_DELAY_MS } from '@duopoker/shared-types';
import type { SessionState } from '@duopoker/shared-types/index';
import { usesRealtimeSocket } from '../config/api';
import { isBotUserId } from '../lib/table-layout';
import { useAppStore } from '../store/useAppStore';

const BOT_STUCK_MS = 2000;

/** Nudge server tick when hand-complete timer elapsed or a bot turn appears stuck. */
export function useTableSessionTick(
  session: SessionState | undefined,
  sessionId: string | undefined
) {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const botStuckSince = useRef<number | null>(null);
  const lastActiveKey = useRef<string | null>(null);

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

  useEffect(() => {
    if (!session || !sessionId) return;

    const street = session.street;
    if (street !== 'BIDDING' && street !== 'TRICKS') {
      botStuckSince.current = null;
      lastActiveKey.current = null;
      return;
    }

    const activeId = session.players[session.activePlayerIndex];
    if (!activeId || !isBotUserId(activeId)) {
      botStuckSince.current = null;
      lastActiveKey.current = null;
      return;
    }

    const activeKey = `${session.handNumber}:${session.activePlayerIndex}:${street}`;
    if (lastActiveKey.current !== activeKey) {
      lastActiveKey.current = activeKey;
      botStuckSince.current = Date.now();
      return;
    }

    const stuckSince = botStuckSince.current;
    if (!stuckSince) return;

    const nudge = () => {
      if (usesRealtimeSocket()) {
        useAppStore.getState().socket?.emit('reconnectSession', { sessionId });
        return;
      }
      void apiFetch(`/game/session/${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { session?: SessionState | null } | null) => {
          if (data?.session) {
            useAppStore.setState({ session: data.session, sessionError: undefined });
          }
        })
        .catch(() => undefined);
    };

    const elapsed = Date.now() - stuckSince;
    if (elapsed >= BOT_STUCK_MS) {
      nudge();
      const id = setInterval(nudge, 1500);
      return () => clearInterval(id);
    }

    const delay = BOT_STUCK_MS - elapsed;
    const timeout = setTimeout(nudge, delay);
    const interval = setInterval(nudge, 1500);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [
    session,
    sessionId,
    session?.street,
    session?.handNumber,
    session?.activePlayerIndex,
    apiFetch
  ]);
}
