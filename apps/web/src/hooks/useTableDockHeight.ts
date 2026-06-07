import { useEffect, type RefObject } from 'react';

const CSS_VAR = '--table-dock-height';
const FALLBACK = '7.5rem';

export function useTableDockHeight(dockRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;

    const sync = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(CSS_VAR, h > 0 ? `${h}px` : FALLBACK);
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
      document.documentElement.style.removeProperty(CSS_VAR);
    };
  }, [dockRef]);
}

export const tableFabBottomClass =
  'bottom-[calc(var(--table-dock-height,7.5rem)+0.75rem+env(safe-area-inset-bottom))]';
