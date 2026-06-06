import type { Server } from 'socket.io';
import { verifyAccessToken } from '../auth/jwt.js';
import { config } from '../config.js';

declare module 'socket.io' {
  interface SocketData {
    userId?: string;
    email?: string;
  }
}

const resolveUserId = (socket: import('socket.io').Socket, payloadUserId?: string): string | undefined => {
  if (typeof socket.data.userId === 'string') return socket.data.userId;
  if (!config.isProduction && typeof payloadUserId === 'string') return payloadUserId;
  return undefined;
};

/** JWT required in production; optional in local dev for guest testing. */
export const attachSocketAuth = (io: Server) => {
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (!token) {
      if (config.isProduction) return next(new Error('AUTH_REQUIRED'));
      return next();
    }
    try {
      const p = verifyAccessToken(token);
      socket.data.userId = p.userId;
      socket.data.email = p.email;
      return next();
    } catch {
      if (config.isProduction) return next(new Error('INVALID_TOKEN'));
      return next();
    }
  });
};

export { resolveUserId };
