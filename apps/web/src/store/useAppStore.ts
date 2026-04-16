import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const LS_ACCESS = 'duopoker_access';
const LS_REFRESH = 'duopoker_refresh';

type AppStore = {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  mode: 'HOLDEM' | 'RASPISNOY';
  session?: SessionState;
  socket?: Socket;
  setMode: (mode: 'HOLDEM' | 'RASPISNOY') => void;
  setTokens: (access: string, refresh: string, userId: string) => void;
  logout: () => void;
  connect: () => void;
  queue: () => void;
  loginDemo: () => Promise<void>;
  readyNextHand: () => void;
};

const readStored = (): { access?: string; refresh?: string } => {
  try {
    return {
      access: localStorage.getItem(LS_ACCESS) ?? undefined,
      refresh: localStorage.getItem(LS_REFRESH) ?? undefined
    };
  } catch {
    return {};
  }
};

export const useAppStore = create<AppStore>((set, get) => {
  const initial = readStored();
  return {
    userId: 'guest',
    accessToken: initial.access,
    refreshToken: initial.refresh,
    mode: 'HOLDEM',
    setMode: (mode) => set({ mode }),
    setTokens: (access, refresh, userId) => {
      localStorage.setItem(LS_ACCESS, access);
      localStorage.setItem(LS_REFRESH, refresh);
      set({ accessToken: access, refreshToken: refresh, userId });
    },
    logout: () => {
      localStorage.removeItem(LS_ACCESS);
      localStorage.removeItem(LS_REFRESH);
      get().socket?.disconnect();
      set({ accessToken: undefined, refreshToken: undefined, userId: 'guest', socket: undefined });
    },
    connect: () => {
      if (get().socket) return;
      const { accessToken } = get();
      const socket = io(API, {
        auth: accessToken ? { token: accessToken } : undefined
      });
      socket.on('stateUpdate', (session: SessionState) => set({ session }));
      socket.on('matchFound', (match: { sessionId: string; buyIn?: number }) => {
        socket.emit('joinSession', {
          sessionId: match.sessionId,
          userId: get().userId,
          mode: get().mode,
          buyIn: match.buyIn ?? 100
        });
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
    readyNextHand: () => {
      const sid = get().session?.sessionId;
      if (!sid) return;
      get().socket?.emit('readyNextHand', { sessionId: sid });
    },
    loginDemo: async () => {
      const email = `dev-${Math.random().toString(16).slice(2, 8)}@duopoker.local`;
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password12', displayName: 'Dev' })
      });
      if (!res.ok) throw new Error('register failed');
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        user: { id: string };
      };
      get().logout();
      set({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.user.id
      });
      localStorage.setItem(LS_ACCESS, data.accessToken);
      localStorage.setItem(LS_REFRESH, data.refreshToken);
      get().socket?.disconnect();
      set({ socket: undefined });
      get().connect();
    }
  };
});
