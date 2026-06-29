import type { SessionState } from '@duopoker/shared-types/index';
import type { Socket } from 'socket.io-client';

export const TABLE_SOCKET_EVENTS = [
  'stateUpdate',
  'sessionEvent',
  'sessionReconnected',
  'sessionError',
  'leftTable',
  'tableClosed',
  'connect'
] as const;

export type TableSocketHandlers = {
  onStateUpdate: (session: SessionState) => void;
  onSessionEvent: (evt: { state?: SessionState }) => void;
  onSessionReconnected: (payload: { snapshot?: SessionState | null }) => void;
  onSessionError: (err: { code?: string }) => void;
  onLeftTable: () => void;
  onTableClosed: (payload: { clubId?: string; tableId?: string; sessionId?: string }) => void;
  onConnect: () => void;
};

/** Remove table listeners before re-registering (prevents stacked handlers on reconnect). */
export const detachTableSocket = (socket: Socket | undefined): void => {
  if (!socket) return;
  for (const event of TABLE_SOCKET_EVENTS) {
    socket.off(event);
  }
};

export const bindTableSocket = (socket: Socket, handlers: TableSocketHandlers): void => {
  detachTableSocket(socket);
  socket.on('stateUpdate', handlers.onStateUpdate);
  socket.on('sessionEvent', handlers.onSessionEvent);
  socket.on('sessionReconnected', handlers.onSessionReconnected);
  socket.on('sessionError', handlers.onSessionError);
  socket.on('leftTable', handlers.onLeftTable);
  socket.on('tableClosed', handlers.onTableClosed);
  socket.on('connect', handlers.onConnect);
};
