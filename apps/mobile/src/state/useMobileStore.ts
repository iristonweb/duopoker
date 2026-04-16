import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { io, Socket } from 'socket.io-client';

type MobileStore = {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  socket?: Socket;
  setTokens: (access: string, refresh: string) => Promise<void>;
  connectSocket: () => void;
};

export const useMobileStore = create<MobileStore>((set, get) => ({
  userId: `mobile-${Math.random().toString(16).slice(2, 8)}`,
  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync('refreshToken', refresh);
    set({ accessToken: access, refreshToken: refresh });
    get().socket?.disconnect();
    set({ socket: undefined });
    get().connectSocket();
  },
  connectSocket: () => {
    if (get().socket) return;
    const token = get().accessToken;
    const socket = io('http://localhost:4000', {
      auth: token ? { token } : undefined
    });
    set({ socket });
  }
}));
