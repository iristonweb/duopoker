export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

type TokenRefresh = () => Promise<string | undefined>;
let tokenRefresh: TokenRefresh | undefined;

/** Wired from useMobileStore on bootstrap — enables 401 retry. */
export function registerTokenRefresh(fn: TokenRefresh) {
  tokenRefresh = fn;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
  retried = false
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const res = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  if (res.status === 401 && tokenRefresh && accessToken && !retried) {
    const fresh = await tokenRefresh();
    if (fresh) return apiFetch(path, init, fresh, true);
  }
  return res;
}

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  nickname?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('login_failed');
  return res.json() as Promise<LoginResponse>;
}

export async function appleLoginRequest(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null }
): Promise<LoginResponse> {
  const res = await apiFetch('/oauth/apple', {
    method: 'POST',
    body: JSON.stringify({ identityToken, fullName })
  });
  if (!res.ok) throw new Error('apple_login_failed');
  return res.json() as Promise<LoginResponse>;
}

export async function acceptInviteRequest(accessToken: string, code: string) {
  const res = await apiFetch(`/clubs/invite/${encodeURIComponent(code)}/accept`, { method: 'POST' }, accessToken);
  if (!res.ok) throw new Error('accept_failed');
  return res.json() as Promise<{ clubId: string; tableId: string }>;
}

export async function joinSessionRequest(
  accessToken: string,
  sessionId: string,
  mode: 'HOLDEM' | 'JOKER' = 'HOLDEM',
  buyIn = 100
) {
  const res = await apiFetch(
    '/game/join',
    { method: 'POST', body: JSON.stringify({ sessionId, mode, buyIn }) },
    accessToken
  );
  if (!res.ok) throw new Error('join_failed');
}
