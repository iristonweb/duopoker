import { useEffect } from 'react';

const CSS_VAR = '--app-vh';

function syncViewportHeight() {
  const raw = window.visualViewport?.height ?? window.innerHeight;
  const h = Math.max(raw, 320);
  document.documentElement.style.setProperty(CSS_VAR, `${h * 0.01}px`);
}

/** Keeps --app-vh in sync for stable full-height layouts on iOS PWA / orientation change. */
export function useViewportHeight() {
  useEffect(() => {
    syncViewportHeight();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewportHeight);
    vv?.addEventListener('scroll', syncViewportHeight);
    window.addEventListener('orientationchange', syncViewportHeight);
    window.addEventListener('resize', syncViewportHeight);
    return () => {
      vv?.removeEventListener('resize', syncViewportHeight);
      vv?.removeEventListener('scroll', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
      window.removeEventListener('resize', syncViewportHeight);
      document.documentElement.style.removeProperty(CSS_VAR);
    };
  }, []);
}
