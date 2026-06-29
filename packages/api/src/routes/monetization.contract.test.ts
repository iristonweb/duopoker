import { describe, expect, it } from 'vitest';
import { monetizationRoutes } from './monetization.js';

describe('monetization contract', () => {
  it('registers billing and IAP webhook routes', () => {
    const paths = monetizationRoutes.routes.map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain('GET /catalog');
    expect(paths).toContain('POST /stripe/webhook');
    expect(paths).toContain('POST /revenuecat/webhook');
    expect(paths).toContain('POST /purchase');
  });
});
