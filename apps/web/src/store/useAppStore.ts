import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
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
  setMode: (mode: 'HOLDEM' | 'RASPISNOY') => void;
  setTokens: (access: string, refresh: string, userId: string) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  connect: () => void;
  queue: () => void;
  playerAction: (payload: {
    sessionId: string;
    type: 'bet' | 'check' | 'fold' | 'call' | 'raise';
    amount?: number;
  }) => void;
  readyNextHand: () => void;
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
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      localStorage.removeItem(LS_USER_ID);
      get().socket?.disconnect();
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
      queueMicrotask(() => get().connect());
    },
    refreshAccessToken: async () => {
      const rt = get().refreshToken;
      if (!rt) return false;
      try {
        const res = await fetch(`${API}/auth/refresh`, {
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
      if (get().socket?.connected) return;
      get().socket?.disconnect();
      const token = get().accessToken;
      const socket = io(API, {
        auth: token ? { token } : undefined,
        reconnection: true
      });
      socket.on('stateUpdate', (session: SessionState) => set({ session }));
      socket.on('sessionError', (err: { code?: string }) => {
        set({ authError: err.code ?? 'session_error' });
      });
      set({ socket });
    },
    queue: () => {
      get().socket?.emit('queueMatchmaking', {
        userId: get().userId,
        mode: get().mode,
        buyIn: 100
      });
    },
    playerAction: ({ sessionId, type, amount }) => {
      get().socket?.emit('playerAction', {
        sessionId,
        userId: get().userId,
        type,
        amount,
        at: Date.now()
      });
    },
    readyNextHand: () => {
      const sid = get().session?.sessionId;
      if (!sid) return;
      get().socket?.emit('readyNextHand', { sessionId: sid });
    },
    register: async (email, password, displayName) => {
      set({ authError: undefined });
      const res = await fetch(`${API}/auth/register`, {
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
      set({ authError: undefined });
      const res = await fetch(`${API}/auth/login`, {
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
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.status === 401) {
          const ok = await get().refreshAccessToken();
          if (!ok) return;
          return get().fetchProfile();
        }
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

