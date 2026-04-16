/**
 * Resolves the backend origin (REST + Socket.IO).
 *
 * In Vercel/production, `VITE_API_URL` must be set at **build** time to your real API
 * (e.g. https://api.example.com). An **empty** env var string is treated as missing:
 * without that, browsers would call `/auth/...` on the static site host and get 404.
 */
export function getApiBase(): string | null {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (t) return t.replace(/\/$/, '');
  if (import.meta.env.DEV) return 'http://localhost:4000';
  return null;
}

export function isBackendConfigured(): boolean {
  return getApiBase() !== null;
}
