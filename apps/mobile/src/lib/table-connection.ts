import { useTableStore } from '../state/useTableStore';

/** Stop polling/socket and clear session — call on screen unmount or logout. */
export function cleanupTableConnection() {
  const store = useTableStore.getState();
  store.stopPolling();
  store.socket?.disconnect();
  useTableStore.setState({ socket: undefined, session: undefined, sessionError: undefined });
}
