import { describe, expect, it } from 'vitest';
import { resetAppleJwksCacheForTests } from '@duopoker/server-core/oauth/apple';

describe('apple-oauth', () => {
  it('rejects malformed identity tokens', async () => {
    resetAppleJwksCacheForTests();
    const { verifyAppleIdentityToken } = await import('@duopoker/server-core/oauth/apple');
    await expect(verifyAppleIdentityToken('not-a-jwt', 'app.duopoker.mobile')).rejects.toThrow(
      'Invalid Apple identity token'
    );
  });
});
