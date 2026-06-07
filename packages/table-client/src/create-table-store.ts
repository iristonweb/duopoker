import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';
import { createApiHelpers, type TableClientConfig } from './config';

export type PlayerActionPayload = {
  sessionId: string;
  type: 'bet' | 'check' | 'fold' | 'call' | 'raise' | 'bid' | 'playCard' | 'chooseTrump';
  amount?: number;
  card?: string;
  trumpSuit?: 'S' | 'H' | 'D' | 'C' | null;
  declaration?:
    | 'nominal'
    | 'senior'
    | 'minor'
    | { suit: 'S' | 'H' | 'D' | 'C'; rankMode: 'senior' | 'minor' };
};

export type TableSessionCallbacks = {
  onLeftTable?: () => void;
  onTableClosed?: (payload: { clubId?: string; tableId?: string; sessionId?: string }) => void;
  /** Return false to ignore incoming table state updates. */
  shouldAcceptTableState?: () => boolean;
  /** Called when socket reconnects and session is active. */
  onReconnectSession?: (sessionId: string) => void;
};

export type TableStoreDeps = TableClientConfig &
  TableSessionCallbacks & {
    getUserId: () => string;
    getAccessToken: () => string | undefined;
    getMode: () => 'HOLDEM' | 'JOKER';
    apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  };

export type TableSessionStore = {
  session?: SessionState;
  sessionError?: string;
  tableVoluntaryLeave: boolean;
  socket?: Socket;
  pollTimer?: ReturnType<typeof setInterval>;
  resetTableJoin: () => void;
  connect: () => void;
  joinSession: (sessionId: string, mode?: 'HOLDEM' | 'JOKER', buyIn?: number) => Promise<void>;
  pollSession: (sessionId: string) => void;
  stopPolling: () => void;
  playerAction: (payload: PlayerActionPayload) => Promise<void>;
  readyNextHand: () => Promise<void>;
  leaveTable: (sessionId: string) => Promise<{ ok: boolean; reason?: string }>;
  clearTableSession: () => void;
  setSession: (session: SessionState | undefined) => void;
  setSessionError: (code: string | undefined) => void;
  reconnectSession: (sessionId: string) => void;
};

export function createTableSessionStore(deps: TableStoreDeps) {
  const { getApiBase, usesRealtimeSocket } = createApiHelpers(deps);

  return create<TableSessionStore>((set, get) => ({
    tableVoluntaryLeave: false,
    resetTableJoin: () => set({ tableVoluntaryLeave: false }),
    setSession: (session) => set({ session, sessionError: undefined }),
    setSessionError: (sessionError) => set({ sessionError }),

    connect: () => {
      if (!usesRealtimeSocket()) return;
      const base = getApiBase();
      if (!base) return;
      const existing = get().socket;
      if (existing?.connected) return;
      if (existing) {
        existing.connect();
        return;
      }
      const token = deps.getAccessToken();
      const socket = io(base, {
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelayMax: 10_000,
        transports: ['websocket', 'polling']
      });

      const shouldAccept = () => {
        if (get().tableVoluntaryLeave) return false;
        return deps.shouldAcceptTableState?.() ?? true;
      };

      socket.on('stateUpdate', (session: SessionState) => {
        if (!shouldAccept()) return;
        set({ session, sessionError: undefined });
      });
      socket.on('sessionEvent', (evt: { state?: SessionState }) => {
        if (!shouldAccept()) return;
        if (evt.state) set({ session: evt.state, sessionError: undefined });
      });
      socket.on('sessionReconnected', (payload: { snapshot?: SessionState | null }) => {
        if (!shouldAccept()) return;
        if (payload.snapshot) set({ session: payload.snapshot, sessionError: undefined });
      });
      socket.on('sessionError', (err: { code?: string }) => {
        set({ sessionError: err.code ?? 'session_error' });
      });
      socket.on('leftTable', () => {
        get().stopPolling();
        set({ tableVoluntaryLeave: true, session: undefined, sessionError: undefined });
        deps.onLeftTable?.();
      });
      socket.on(
        'tableClosed',
        (payload: { clubId?: string; tableId?: string; sessionId?: string }) => {
          const sid = get().session?.sessionId;
          if (payload.sessionId && sid && payload.sessionId !== sid) return;
          get().stopPolling();
          set({
            tableVoluntaryLeave: true,
            session: undefined,
            sessionError: 'table_closed'
          });
          deps.onTableClosed?.(payload);
        }
      );
      socket.on('connect', () => {
        const sid = get().session?.sessionId;
        if (!sid) return;
        if (deps.shouldAcceptTableState && !deps.shouldAcceptTableState()) return;
        socket.emit('reconnectSession', { sessionId: sid });
        deps.onReconnectSession?.(sid);
      });
      set({ socket });
    },

    joinSession: async (sessionId, mode, buyIn = 100) => {
      if (get().tableVoluntaryLeave) return;
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('joinSession', {
          sessionId,
          userId: deps.getUserId(),
          mode: mode ?? deps.getMode(),
          buyIn
        });
        return;
      }
      const res = await deps.apiFetch('/game/join', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          mode: mode ?? deps.getMode(),
          buyIn
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'join_failed' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },

    pollSession: (sessionId) => {
      if (usesRealtimeSocket() || get().tableVoluntaryLeave) return;
      get().stopPolling();
      const tick = async () => {
        if (get().tableVoluntaryLeave) return;
        try {
          const res = await deps.apiFetch(`/game/session/${encodeURIComponent(sessionId)}`);
          if (res.status === 403) {
            set({ session: undefined, sessionError: 'NOT_SEATED' });
            return;
          }
          if (!res.ok) return;
          const data = (await res.json()) as { session: SessionState | null };
          if (data.session) set({ session: data.session, sessionError: undefined });
        } catch {
          /* ignore */
        }
      };
      void tick();
      const pollTimer = setInterval(tick, 900);
      set({ pollTimer });
    },

    stopPolling: () => {
      const t = get().pollTimer;
      if (t) clearInterval(t);
      set({ pollTimer: undefined });
    },

    playerAction: async ({ sessionId, type, amount, card, trumpSuit, declaration }) => {
      if (usesRealtimeSocket()) {
        const socket = get().socket;
        if (!socket?.connected) {
          set({ sessionError: 'connection_lost' });
          return;
        }
        set({ sessionError: undefined });
        socket.emit('playerAction', {
          sessionId,
          userId: deps.getUserId(),
          type,
          amount,
          card,
          trumpSuit,
          declaration,
          at: Date.now()
        });
        return;
      }
      const res = await deps.apiFetch('/game/action', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          type,
          amount,
          card,
          trumpSuit,
          declaration,
          at: Date.now()
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'action_rejected' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },

    readyNextHand: async () => {
      const sid = get().session?.sessionId;
      if (!sid) return;
      if (usesRealtimeSocket()) {
        get().socket?.emit('readyNextHand', { sessionId: sid, userId: deps.getUserId() });
        return;
      }
      const res = await deps.apiFetch('/game/ready-next-hand', {
        method: 'POST',
        body: JSON.stringify({ sessionId: sid })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'ready_failed' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },

    clearTableSession: () => {
      get().stopPolling();
      set({ tableVoluntaryLeave: true, session: undefined, sessionError: undefined });
    },

    leaveTable: async (sessionId) => {
      get().stopPolling();
      set({ tableVoluntaryLeave: true });
      const clearLocal = () =>
        set({ tableVoluntaryLeave: true, session: undefined, sessionError: undefined });
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('leaveTable', { sessionId, userId: deps.getUserId() });
        clearLocal();
        return { ok: true };
      }
      const res = await deps.apiFetch('/game/leave', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const reason = (err as { code?: string }).code ?? 'leave_failed';
        if (reason === 'NOT_SEATED' || reason === 'SESSION_NOT_FOUND') {
          clearLocal();
          return { ok: true, reason };
        }
        set({ sessionError: reason });
        return { ok: false, reason };
      }
      clearLocal();
      return { ok: true };
    },

    reconnectSession: (sessionId) => {
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('reconnectSession', { sessionId });
        return;
      }
      void deps
        .apiFetch(`/game/session/${encodeURIComponent(sessionId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { session?: SessionState | null } | null) => {
          if (data?.session) set({ session: data.session, sessionError: undefined });
        })
        .catch(() => undefined);
    }
  }));
}

export type TableSessionStoreApi = ReturnType<typeof createTableSessionStore>;
