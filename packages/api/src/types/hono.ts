import type { AccessTokenPayload } from '../auth/jwt.js';

declare module 'hono' {
  interface ContextVariableMap {
    auth: AccessTokenPayload;
  }
}
