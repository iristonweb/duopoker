export type TableClientConfig = {
  getApiBase: () => string;
  /** When true, same-origin Vercel-style API under `/api`. */
  isSameOriginApi?: (base: string) => boolean;
};

export function createApiHelpers(config: TableClientConfig) {
  const getApiBase = () => config.getApiBase().replace(/\/$/, '');

  const usesVercelSameOriginApi = (base: string): boolean => {
    if (config.isSameOriginApi) return config.isSameOriginApi(base);
    if (!base) return true;
    if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
      const loc = (globalThis as { location?: { origin?: string } }).location;
      return base.replace(/\/$/, '') === (loc?.origin ?? '').replace(/\/$/, '');
    }
    return false;
  };

  const resolveApiUrl = (path: string): string => {
    const base = getApiBase();
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!base || usesVercelSameOriginApi(base)) return `/api${normalized}`;
    return `${base}${normalized}`;
  };

  const usesRealtimeSocket = (): boolean => {
    const base = getApiBase();
    if (!base) return false;
    return !usesVercelSameOriginApi(base);
  };

  return { getApiBase, resolveApiUrl, usesRealtimeSocket, usesVercelSameOriginApi };
}
