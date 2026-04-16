import type { Server } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt.js';

declare module 'socket.io' {
  interface SocketData {
    userId?: string;
    email?: string;
  }
}

/** Attaches authenticated user to socket.data when client sends `auth.token` JWT. */
export const attachOptionalSocketAuth = (io: Server) => {
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (!token) {
      return next();
    }
    try {
      const p = verifyAccessToken(token);
      socket.data.userId = p.userId;
      socket.data.email = p.email;
      return next();
    } catch {
      return next(new Error('INVALID_SOCKET_TOKEN'));
    }
  });
};
