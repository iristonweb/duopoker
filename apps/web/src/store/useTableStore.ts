import { createTableSessionStore } from '@duopoker/table-client';
import { getApiBase, resolveApiUrl, usesRealtimeSocket } from '../config/api';
import { useAppStore } from './useAppStore';

const shouldAcceptTableState = (): boolean => {
  const { tableVoluntaryLeave, tableMinimized } = useAppStore.getState();
  if (tableVoluntaryLeave) return false;
  if (typeof window === 'undefined') return true;
  return window.location.pathname.startsWith('/table/') || tableMinimized;
};

export const useTableStore = createTableSessionStore({
  getApiBase,
  isSameOriginApi: () => !getApiBase(),
  getUserId: () => useAppStore.getState().userId,
  getAccessToken: () => useAppStore.getState().accessToken,
  getMode: () => useAppStore.getState().mode,
  apiFetch: (path, init) => useAppStore.getState().apiFetch(path, init),
  shouldAcceptTableState,
  onLeftTable: () => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/table/')) {
      window.location.replace('/lobby');
    }
  },
  onTableClosed: (payload) => {
    useAppStore.setState((s) => ({
      tableLiveSessions: s.tableLiveSessions.filter((t) => t.sessionId !== payload.sessionId),
      tableInvites: s.tableInvites.filter((t) => t.tableId !== payload.tableId)
    }));
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/table/')) {
      window.location.replace('/lobby');
    }
  },
  onReconnectSession: (sessionId) => {
    const userId = useAppStore.getState().userId;
    useTableStore.getState().socket?.emit('reconnectSession', { sessionId, userId });
  }
});

export { usesRealtimeSocket, resolveApiUrl };
