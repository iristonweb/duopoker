import { useEffect, type RefObject } from 'react';

const CSS_VAR = '--table-dock-height';
const FALLBACK = '7.5rem';

export function useTableDockHeight(
  dockRef: RefObject<HTMLElement | null>,
  {
    cssVar = CSS_VAR,
    fallback = FALLBACK,
    extraVars
  }: {
    cssVar?: string;
    fallback?: string;
    extraVars?: (height: string) => Record<string, string>;
  } = {}
) {
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;

    const sync = () => {
      const h = el.getBoundingClientRect().height;
      const value = h > 0 ? `${h}px` : fallback;
      document.documentElement.style.setProperty(cssVar, value);
      const extra = extraVars?.(value) ?? {};
      for (const [key, val] of Object.entries(extra)) {
        document.documentElement.style.setProperty(key, val);
      }
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('resize', sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty(cssVar);
      const extra = extraVars?.(fallback) ?? {};
      for (const key of Object.keys(extra)) {
        document.documentElement.style.removeProperty(key);
      }
    };
  }, [cssVar, dockRef, extraVars, fallback]);
}

export const tableFabBottomClass =
  'bottom-[calc(var(--table-dock-height,7.5rem)+0.75rem+env(safe-area-inset-bottom))]';
