/**
 * API / WebSocket origin.
 *
 * **Production (full realtime):** set `VITE_API_URL` to your Render/Fly backend
 * (e.g. `https://duopoker-api.onrender.com`). REST + Socket.IO + voice use the same host.
 *
 * **Vercel-only fallback:** leave empty — same-origin `/api/*` serverless + REST polling (no voice).
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (t) return t.replace(/\/$/, '');
  return '';
}

/** Same-origin Vercel API lives under `/api`; Express/Render uses bare paths. */
export function resolveApiUrl(path: string): string {
  const base = getApiBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalized}` : `/api${normalized}`;
}

/** External long-lived backend with Socket.IO (Render, local Express, Fly.io). */
export function usesRealtimeSocket(): boolean {
  return getApiBase().length > 0;
}

export function isBackendConfigured(): boolean {
  return usesRealtimeSocket() || import.meta.env.PROD;
}
