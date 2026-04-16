import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { io, Socket } from 'socket.io-client';

type MobileStore = {
  userId: string;
  refreshToken?: string;
  socket?: Socket;
  setRefreshToken: (token: string) => Promise<void>;
  connectSocket: () => void;
};

export const useMobileStore = create<MobileStore>((set, get) => ({
  userId: `mobile-${Math.random().toString(16).slice(2, 8)}`,
  setRefreshToken: async (token) => {
    await SecureStore.setItemAsync('refreshToken', token);
    set({ refreshToken: token });
  },
  connectSocket: () => {
    if (get().socket) return;
    const socket = io('http://localhost:4000');
    set({ socket });
  }
}));
