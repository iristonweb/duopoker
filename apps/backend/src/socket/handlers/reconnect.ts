import type { Server, Socket } from 'socket.io';
import { sanitizeStateForViewer } from '@duopoker/game-engine/index';
import { assertCanJoinSession } from '../../services/session-access.js';
import { getSessionSnapshot, tickSession } from '../../services/game-session.js';
import { getUserSubscriptionTier } from '../../services/subscription-tier.js';
import { resolveUserId } from '../socket-auth.js';

type BroadcastFn = (io: Server, sessionId: string, state: import('@duopoker/shared-types/index').SessionState) => Promise<void>;

export const registerReconnectHandler = (
  io: Server,
  socket: Socket,
  registerUserSocket: (userId: string, socketId: string) => void,
  broadcastSessionState: BroadcastFn
) => {
  socket.on('reconnectSession', async (payload: { sessionId?: string; userId?: string }) => {
    const sessionId = payload?.sessionId;
    const userId = resolveUserId(socket, payload?.userId);
    if (!sessionId || !userId) {
      socket.emit('sessionError', { code: 'INVALID_RECONNECT' });
      return;
    }
    socket.data.userId = userId;
    const access = await assertCanJoinSession(sessionId, userId);
    if (!access.ok) {
      socket.emit('sessionError', { code: access.reason });
      return;
    }
    registerUserSocket(userId, socket.id);
    await socket.join(sessionId);
    const snapshot = (await tickSession(sessionId)) ?? (await getSessionSnapshot(sessionId));
    if (!snapshot) {
      socket.emit('sessionError', { code: 'SESSION_NOT_FOUND' });
      return;
    }
    const subscriptionTier = await getUserSubscriptionTier(userId);
    const sanitized = sanitizeStateForViewer(snapshot, userId, { subscriptionTier });
    socket.emit('sessionState', sanitized);
    socket.emit('sessionReconnected', { sessionId, snapshot: sanitized });
    await broadcastSessionState(io, sessionId, snapshot);
  });
};
