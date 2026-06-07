import { router } from 'expo-router';
import { createTableSessionStore, createApiHelpers } from '@duopoker/table-client';
import { API_BASE, apiFetch } from '../lib/api';
import { useMobileStore } from './useMobileStore';

const apiRoot = API_BASE.replace(/\/api\/?$/, '');

const { usesRealtimeSocket } = createApiHelpers({
  getApiBase: () => apiRoot,
  isSameOriginApi: () => false
});

export const useTableStore = createTableSessionStore({
  getApiBase: () => apiRoot,
  isSameOriginApi: () => false,
  getUserId: () => useMobileStore.getState().userId,
  getAccessToken: () => useMobileStore.getState().accessToken,
  getMode: () => {
    const s = useTableStore.getState().session;
    return s?.mode ?? 'HOLDEM';
  },
  apiFetch: (path, init) => apiFetch(path, init, useMobileStore.getState().accessToken),
  shouldAcceptTableState: () => true,
  onLeftTable: () => {
    router.replace('/lobby');
  },
  onTableClosed: () => {
    router.replace('/lobby');
  }
});

export { usesRealtimeSocket };
