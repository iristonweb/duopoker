import { useEffect, useRef } from 'react';
import { NEXT_HAND_DELAY_MS } from '@duopoker/shared-types';
import type { SessionState } from '@duopoker/shared-types/index';
import { isBotUserId } from '../layout/rotate-players';

const BOT_STUCK_MS = 8000;

export type TableSessionTickDeps = {
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  usesRealtimeSocket: () => boolean;
  reconnectSession: (sessionId: string) => void;
  setSession: (session: SessionState) => void;
};

/** Nudge server tick when hand-complete timer elapsed or a bot turn appears stuck. */
export function useTableSessionTick(
  session: SessionState | undefined,
  sessionId: string | undefined,
  deps: TableSessionTickDeps
) {
  const botStuckSince = useRef<number | null>(null);
  const lastActiveKey = useRef<string | null>(null);
  const hasNudged = useRef(false);

  useEffect(() => {
    if (!session || !sessionId || session.street !== 'COMPLETE') return;

    const overdue =
      !session.handCompletedAt || Date.now() - session.handCompletedAt >= NEXT_HAND_DELAY_MS;
    if (!overdue) return;

    const pull = () => {
      void deps
        .apiFetch(`/game/session/${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { session?: SessionState | null } | null) => {
          if (data?.session) deps.setSession(data.session);
        })
        .catch(() => undefined);
    };

    pull();
    const id = setInterval(pull, 1200);
    return () => clearInterval(id);
  }, [session?.street, session?.handCompletedAt, session?.handNumber, sessionId, deps]);

  useEffect(() => {
    if (!session || !sessionId) return;

    const street = session.street;
    if (!street || street === 'LOBBY' || street === 'COMPLETE' || street === 'SHOWDOWN') {
      botStuckSince.current = null;
      lastActiveKey.current = null;
      hasNudged.current = false;
      return;
    }

    const activeId = session.players[session.activePlayerIndex];
    if (!activeId || !isBotUserId(activeId)) {
      botStuckSince.current = null;
      lastActiveKey.current = null;
      hasNudged.current = false;
      return;
    }

    const activeKey = `${session.handNumber}:${session.activePlayerIndex}:${street}`;
    if (lastActiveKey.current !== activeKey) {
      lastActiveKey.current = activeKey;
      botStuckSince.current = Date.now();
      hasNudged.current = false;
    }

    if (hasNudged.current) return;

    const stuckSince = botStuckSince.current;
    if (!stuckSince) return;

    const nudge = () => {
      deps.reconnectSession(sessionId);
    };

    const delay = Math.max(0, BOT_STUCK_MS - (Date.now() - stuckSince));
    const timeout = setTimeout(() => {
      hasNudged.current = true;
      nudge();
    }, delay);

    return () => clearTimeout(timeout);
  }, [sessionId, session?.street, session?.handNumber, session?.activePlayerIndex, deps]);
}
