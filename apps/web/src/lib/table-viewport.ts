/** Shortest screen edge ≤ this value → phone (iOS, Android, mobile browsers). */
export const PHONE_MAX_SHORT = 767;

const PORTRAIT_PHONE_MQ = `(max-width: ${PHONE_MAX_SHORT}px) and (orientation: portrait)`;

export type ViewportSize = { width: number; height: number };

/**
 * Reads layout viewport size. Prefers `visualViewport` so iOS Safari / Android Chrome
 * report the visible area when the URL bar or keyboard is shown.
 */
export function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') return { width: 1280, height: 800 };
  const vv = window.visualViewport;
  const width = Math.round(vv?.width ?? window.innerWidth);
  const height = Math.round(vv?.height ?? window.innerHeight);
  return { width, height: Math.max(height, 320) };
}

export function isPhoneViewport(width: number, height: number): boolean {
  return Math.min(width, height) <= PHONE_MAX_SHORT;
}

/**
 * Phone held in portrait. Uses aspect ratio (works in Playwright) with matchMedia fallback
 * for browsers that report stale dimensions briefly after `orientationchange`.
 */
export function isPhonePortraitViewport(width: number, height: number): boolean {
  if (!isPhoneViewport(width, height)) return false;
  if (height > width) return true;
  if (typeof window !== 'undefined' && width <= PHONE_MAX_SHORT) {
    return window.matchMedia(PORTRAIT_PHONE_MQ).matches;
  }
  return false;
}

export function isPhoneLandscapeViewport(width: number, height: number): boolean {
  return isPhoneViewport(width, height) && width > height;
}

/** Subscribe to viewport changes across resize, orientation, and visualViewport (mobile browsers). */
export function subscribeViewportChange(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const mq = window.matchMedia(PORTRAIT_PHONE_MQ);
  const sync = () => onChange();

  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  mq.addEventListener('change', sync);

  const vv = window.visualViewport;
  vv?.addEventListener('resize', sync);
  vv?.addEventListener('scroll', sync);

  return () => {
    window.removeEventListener('resize', sync);
    window.removeEventListener('orientationchange', sync);
    mq.removeEventListener('change', sync);
    vv?.removeEventListener('resize', sync);
    vv?.removeEventListener('scroll', sync);
  };
}
