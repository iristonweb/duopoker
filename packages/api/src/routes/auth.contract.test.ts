import { describe, expect, it } from 'vitest';
import { authRoutes } from './auth.js';

describe('auth contract', () => {
  it('registers core auth routes', () => {
    const paths = authRoutes.routes.map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain('POST /register');
    expect(paths).toContain('POST /login');
    expect(paths).toContain('POST /refresh');
    expect(paths).toContain('POST /logout');
    expect(paths).toContain('GET /me');
  });
});
