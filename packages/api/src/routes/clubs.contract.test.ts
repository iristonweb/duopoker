import { describe, expect, it } from 'vitest';
import { clubsRoutes } from './clubs.js';

describe('clubs contract', () => {
  it('registers core club routes', () => {
    const paths = clubsRoutes.routes.map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain('GET /plans');
    expect(paths).toContain('POST /');
    expect(paths).toContain('GET /mine');
    expect(paths).toContain('GET /:clubId');
    expect(paths).toContain('POST /:clubId/checkout');
    expect(paths).toContain('POST /:clubId/plan/change');
    expect(paths).toContain('GET /:clubId/invoices');
    expect(paths).toContain('PATCH /:clubId/members/:memberUserId');
  });
});
