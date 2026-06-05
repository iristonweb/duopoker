import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';
import { getApiBase, usesRealtimeSocket } from '../config/api';

const LS_ACCESS = 'duopoker_access';
const LS_REFRESH = 'duopoker_refresh';
const LS_GUEST = 'duopoker_guest_id';
const LS_USER_ID = 'duopoker_user_id';

const guestId = (): string => {
  try {
    let id = localStorage.getItem(LS_GUEST);
    if (!id) {
      id = `guest-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(LS_GUEST, id);
    }
    return id;
  } catch {
    return `guest-${Math.random().toString(36).slice(2, 12)}`;
  }
};

type AppStore = {
  userId: string;
  email?: string;
  displayName?: string;
  chips?: number;
  accessToken?: string;
  refreshToken?: string;
  mode: 'HOLDEM' | 'RASPISNOY';
  session?: SessionState;
  socket?: Socket;
  authError?: string;
  sessionError?: string;
  pollTimer?: ReturnType<typeof setInterval>;
  setMode: (mode: 'HOLDEM' | 'RASPISNOY') => void;
  setTokens: (access: string, refresh: string, userId: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  connect: () => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  queue: () => Promise<{ status: 'waiting' | 'matched'; sessionId?: string }>;
  joinSession: (sessionId: string, mode?: 'HOLDEM' | 'RASPISNOY', buyIn?: number) => Promise<void>;
  pollSession: (sessionId: string) => void;
  stopPolling: () => void;
  playerAction: (payload: {
    sessionId: string;
    type: 'bet' | 'check' | 'fold' | 'call' | 'raise';
    amount?: number;
  }) => Promise<void>;
  readyNextHand: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  fetchProfile: () => Promise<void>;
};

const readStored = (): { access?: string; refresh?: string; storedUserId?: string } => {
  try {
    return {
      access: localStorage.getItem(LS_ACCESS) ?? undefined,
      refresh: localStorage.getItem(LS_REFRESH) ?? undefined,
      storedUserId: localStorage.getItem(LS_USER_ID) ?? undefined
    };
  } catch {
    return {};
  }
};

export const useAppStore = create<AppStore>((set, get) => {
  const initial = readStored();
  return {
    userId: initial.storedUserId ?? guestId(),
    accessToken: initial.access,
    refreshToken: initial.refresh,
    mode: 'HOLDEM',
    setMode: (mode) => set({ mode }),
    setTokens: (access, refresh, userId) => {
      localStorage.setItem(LS_ACCESS, access);
      localStorage.setItem(LS_REFRESH, refresh);
      localStorage.setItem(LS_USER_ID, userId);
      set({ accessToken: access, refreshToken: refresh, userId, authError: undefined });
    },
    logout: () => {
      get().stopPolling();
      get().socket?.disconnect();
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      localStorage.removeItem(LS_USER_ID);
      set({
        accessToken: undefined,
        refreshToken: undefined,
        userId: guestId(),
        socket: undefined,
        session: undefined,
        email: undefined,
        displayName: undefined,
        chips: undefined
      });
      if (usesRealtimeSocket()) queueMicrotask(() => get().connect());
    },
    refreshAccessToken: async () => {
      const rt = get().refreshToken;
      if (!rt) return false;
      try {
        const res = await fetch(`${getApiBase()}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt })
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        get().setTokens(data.accessToken, data.refreshToken, get().userId);
        return true;
      } catch {
        return false;
      }
    },
    connect: () => {
      if (!usesRealtimeSocket()) return;
      const base = getApiBase();
      if (!base) return;
      if (get().socket?.connected) return;
      get().socket?.disconnect();
      const token = get().accessToken;
      const socket = io(base, {
        auth: token ? { token } : undefined,
        reconnection: true,
        transports: ['websocket', 'polling']
      });
      socket.on('stateUpdate', (session: SessionState) => set({ session }));
      socket.on('sessionError', (err: { code?: string }) => {
        set({ sessionError: err.code ?? 'session_error' });
      });
      set({ socket });
    },
    apiFetch: async (path, init = {}) => {
      const base = getApiBase();
      const headers = new Headers(init.headers);
      const token = get().accessToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (!headers.has('Content-Type') && init.body) {
        headers.set('Content-Type', 'application/json');
      }
      let res = await fetch(`${base}${path}`, { ...init, headers });
      if (res.status === 401 && get().refreshToken) {
        const ok = await get().refreshAccessToken();
        if (ok) {
          const retryHeaders = new Headers(init.headers);
          const newToken = get().accessToken;
          if (newToken) retryHeaders.set('Authorization', `Bearer ${newToken}`);
          if (!retryHeaders.has('Content-Type') && init.body) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          res = await fetch(`${base}${path}`, { ...init, headers: retryHeaders });
        }
      }
      return res;
    },
    queue: async () => {
      set({ sessionError: undefined });
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('queueMatchmaking', {
          userId: get().userId,
          mode: get().mode,
          buyIn: 100
        });
        return { status: 'waiting' as const };
      }
      const res = await get().apiFetch('/game/queue', {
        method: 'POST',
        body: JSON.stringify({
          userId: get().userId,
          mode: get().mode,
          buyIn: 100
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'queue_failed' });
        return { status: 'waiting' as const };
      }
      const data = (await res.json()) as {
        status: 'waiting' | 'matched';
        sessionId?: string;
        mode?: 'HOLDEM' | 'RASPISNOY';
        buyIn?: number;
      };
      if (data.status === 'matched' && data.sessionId) {
        await get().joinSession(data.sessionId, data.mode ?? get().mode, data.buyIn ?? 100);
        return { status: 'matched', sessionId: data.sessionId };
      }
      return { status: 'waiting' };
    },
    joinSession: async (sessionId, mode, buyIn = 100) => {
      if (usesRealtimeSocket()) {
        get().connect();
        get().socket?.emit('joinSession', {
          sessionId,
          userId: get().userId,
          mode: mode ?? get().mode,
          buyIn
        });
        return;
      }
      const res = await get().apiFetch('/game/join', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          userId: get().userId,
          mode: mode ?? get().mode,
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
      if (usesRealtimeSocket()) return;
      get().stopPolling();
      const tick = async () => {
        try {
          const res = await get().apiFetch(
            `/game/session/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(get().userId)}`
          );
          if (!res.ok) return;
          const data = (await res.json()) as { session: SessionState | null };
          if (data.session) set({ session: data.session });
        } catch {
          /* ignore */
        }
      };
      void tick();
      const pollTimer = setInterval(tick, 1500);
      set({ pollTimer });
    },
    stopPolling: () => {
      const t = get().pollTimer;
      if (t) clearInterval(t);
      set({ pollTimer: undefined });
    },
    playerAction: async ({ sessionId, type, amount }) => {
      if (usesRealtimeSocket()) {
        get().socket?.emit('playerAction', {
          sessionId,
          userId: get().userId,
          type,
          amount,
          at: Date.now()
        });
        return;
      }
      const res = await get().apiFetch('/game/action', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          userId: get().userId,
          type,
          amount,
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
        get().socket?.emit('readyNextHand', { sessionId: sid, userId: get().userId });
        return;
      }
      const res = await get().apiFetch('/game/ready-next-hand', {
        method: 'POST',
        body: JSON.stringify({ sessionId: sid, userId: get().userId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        set({ sessionError: (err as { code?: string }).code ?? 'ready_failed' });
        return;
      }
      const data = (await res.json()) as { session: SessionState };
      set({ session: data.session, sessionError: undefined });
    },
    register: async (email, password, displayName) => {
      const base = getApiBase();
      set({ authError: undefined });
      if (!base && !import.meta.env.PROD) {
        set({ authError: 'Set VITE_API_URL=http://localhost:4000 in apps/web/.env for local auth.' });
        throw new Error('no api base');
      }
      const res = await fetch(`${base}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          typeof (err as { error?: unknown }).error === 'string'
            ? (err as { error: string }).error
            : JSON.stringify((err as { error?: unknown }).error ?? err);
        set({ authError: msg });
        throw new Error('register failed');
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; displayName: string };
      };
      localStorage.setItem(LS_ACCESS, data.accessToken);
      localStorage.setItem(LS_REFRESH, data.refreshToken);
      localStorage.setItem(LS_USER_ID, data.user.id);
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.user.id,
        email: data.user.email,
        displayName: data.user.displayName,
        authError: undefined
      });
      get().socket?.disconnect();
      set({ socket: undefined });
      get().connect();
      await get().fetchProfile();
    },
    login: async (email, password) => {
      const base = getApiBase();
      set({ authError: undefined });
      if (!base && !import.meta.env.PROD) {
        set({ authError: 'Set VITE_API_URL=http://localhost:4000 in apps/web/.env for local auth.' });
        throw new Error('no api base');
      }
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        set({ authError: 'invalid_credentials' });
        throw new Error('login failed');
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; displayName: string };
      };
      get().setTokens(data.accessToken, data.refreshToken, data.user.id);
      set({ email: data.user.email, displayName: data.user.displayName, authError: undefined });
      get().socket?.disconnect();
      set({ socket: undefined });
      get().connect();
      await get().fetchProfile();
    },
    fetchProfile: async () => {
      const token = get().accessToken;
      if (!token) return;
      try {
        const res = await get().apiFetch('/auth/me');
        if (!res.ok) return;
        const data = (await res.json()) as {
          user: { chips: number; displayName: string; email: string } | null;
        };
        if (data.user) {
          set({
            chips: data.user.chips,
            displayName: data.user.displayName,
            email: data.user.email
          });
        }
      } catch {
        /* ignore */
      }
    }
  };
});
