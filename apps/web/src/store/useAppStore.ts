import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { SessionState } from '@duopoker/shared-types/index';

type AppStore = {
  userId: string;
  mode: 'HOLDEM' | 'RASPISNOY';
  session?: SessionState;
  socket?: Socket;
  setMode: (mode: 'HOLDEM' | 'RASPISNOY') => void;
  connect: () => void;
  queue: () => void;
};

export const useAppStore = create<AppStore>((set, get) => ({
  userId: `web-${Math.random().toString(16).slice(2, 8)}`,
  mode: 'HOLDEM',
  setMode: (mode) => set({ mode }),
  connect: () => {
    if (get().socket) return;
    const socket = io('http://localhost:4000');
    socket.on('stateUpdate', (session: SessionState) => set({ session }));
    socket.on('matchFound', (match) => {
      socket.emit('joinSession', { sessionId: match.sessionId, userId: get().userId, mode: get().mode });
    });
    set({ socket });
  },
  queue: () => {
    get().socket?.emit('queueMatchmaking', { userId: get().userId, mode: get().mode, buyIn: 100 });
  }
}));
