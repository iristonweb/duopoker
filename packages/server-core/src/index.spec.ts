import { describe, expect, it } from 'vitest';
import { canAccessGameStats } from './profile/stats.js';
import { resetAppleJwksCacheForTests } from './oauth/apple.js';

describe('server-core', () => {
  it('gates api stats to BLACK tier', () => {
    expect(canAccessGameStats('GOLD')).toBe(false);
    expect(canAccessGameStats('BLACK')).toBe(true);
  });

  it('rejects malformed apple tokens', async () => {
    resetAppleJwksCacheForTests();
    const { verifyAppleIdentityToken } = await import('./oauth/apple.js');
    await expect(verifyAppleIdentityToken('bad', 'app.duopoker.mobile')).rejects.toThrow();
  });
});
