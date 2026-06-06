import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { registerMobilePushToken } from '../notifications/register';
import { loginRequest, type AuthUser } from '../lib/api';

const LS_ACCESS = 'duopoker_mobile_access';
const LS_REFRESH = 'duopoker_mobile_refresh';
const LS_USER = 'duopoker_mobile_user';

type MobileStore = {
  userId: string;
  user?: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  ready: boolean;
  authError?: string;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setTokens: (access: string, refresh: string, user: AuthUser) => Promise<void>;
};

export const useMobileStore = create<MobileStore>((set, get) => ({
  userId: '',
  ready: false,
  bootstrap: async () => {
    try {
      const access = await SecureStore.getItemAsync(LS_ACCESS);
      const refresh = await SecureStore.getItemAsync(LS_REFRESH);
      const userRaw = await SecureStore.getItemAsync(LS_USER);
      if (access && refresh && userRaw) {
        const user = JSON.parse(userRaw) as AuthUser;
        await get().setTokens(access, refresh, user);
      }
    } finally {
      set({ ready: true });
    }
  },
  setTokens: async (access, refresh, user) => {
    await SecureStore.setItemAsync(LS_ACCESS, access);
    await SecureStore.setItemAsync(LS_REFRESH, refresh);
    await SecureStore.setItemAsync(LS_USER, JSON.stringify(user));
    set({
      accessToken: access,
      refreshToken: refresh,
      userId: user.id,
      user,
      authError: undefined
    });
    void registerMobilePushToken(access);
  },
  login: async (email, password) => {
    set({ authError: undefined });
    try {
      const data = await loginRequest(email, password);
      await get().setTokens(data.accessToken, data.refreshToken, data.user);
      return true;
    } catch {
      set({ authError: 'login_failed' });
      return false;
    }
  },
  logout: async () => {
    await SecureStore.deleteItemAsync(LS_ACCESS);
    await SecureStore.deleteItemAsync(LS_REFRESH);
    await SecureStore.deleteItemAsync(LS_USER);
    set({ accessToken: undefined, refreshToken: undefined, user: undefined, userId: '' });
  }
}));
