import jwt from 'jsonwebtoken';
import { createPublicKey } from 'node:crypto';

type AppleJwk = {
  kid: string;
  kty: 'RSA';
  alg: string;
  use: string;
  n: string;
  e: string;
};

type AppleJwks = { keys: AppleJwk[] };

export type AppleIdentityPayload = {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
};

let jwksCache: { keys: AppleJwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

const fetchAppleJwks = async (): Promise<AppleJwk[]> => {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch('https://appleid.apple.com/auth/keys');
  if (!res.ok) {
    throw new Error('Failed to fetch Apple JWKS');
  }
  const data = (await res.json()) as AppleJwks;
  jwksCache = { keys: data.keys, fetchedAt: Date.now() };
  return data.keys;
};

const pemForKid = async (kid: string | undefined): Promise<string> => {
  if (!kid) throw new Error('Missing kid on Apple identity token');
  const keys = await fetchAppleJwks();
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error('Unknown Apple signing key');
  const key = createPublicKey({ key: jwk, format: 'jwk' });
  return key.export({ type: 'spki', format: 'pem' }) as string;
};

export const verifyAppleIdentityToken = async (
  identityToken: string,
  clientId: string
): Promise<AppleIdentityPayload> => {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid Apple identity token');
  }
  const pem = await pemForKid(decoded.header.kid);
  const payload = jwt.verify(identityToken, pem, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: clientId
  });
  if (typeof payload === 'string' || !payload.sub) {
    throw new Error('Invalid Apple token payload');
  }
  return payload as AppleIdentityPayload;
};

export const resetAppleJwksCacheForTests = (): void => {
  jwksCache = null;
};
