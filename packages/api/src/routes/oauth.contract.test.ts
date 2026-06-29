import { describe, expect, it } from 'vitest';
import { oauthRoutes } from './oauth.js';

describe('oauth contract', () => {
  it('registers Google and Apple OAuth routes', () => {
    const paths = oauthRoutes.routes.map((r) => `${r.method} ${r.path}`);
    expect(paths).toContain('GET /google/status');
    expect(paths).toContain('POST /google');
    expect(paths).toContain('GET /apple/status');
    expect(paths).toContain('POST /apple');
  });
});
