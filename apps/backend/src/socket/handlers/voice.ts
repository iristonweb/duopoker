import type { Socket } from 'socket.io';
import { assertSeatedInSession } from '../../services/session-access.js';
import { resolveUserId } from '../socket-auth.js';

export const registerVoiceSignalHandler = (
  socket: Socket,
  assertSocketInSession: (sessionId: string) => Promise<boolean>
) => {
  socket.on('voiceSignal', async (payload: Record<string, unknown>) => {
    const sid = typeof payload.sessionId === 'string' ? payload.sessionId : '';
    if (!sid) return;
    const userId = resolveUserId(socket, undefined);
    if (!userId) {
      socket.emit('sessionError', { code: 'AUTH_REQUIRED' });
      return;
    }
    if (!(await assertSocketInSession(sid))) {
      socket.emit('sessionError', { code: 'NOT_IN_SESSION' });
      return;
    }
    const seated = await assertSeatedInSession(sid, userId);
    if (!seated.ok) {
      socket.emit('sessionError', { code: seated.reason });
      return;
    }
    socket.to(sid).emit('voiceSignal', { ...payload, from: socket.id });
  });
};
