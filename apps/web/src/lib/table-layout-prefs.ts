const IMMERSIVE_KEY = 'duopoker_mobile_immersive_table';

export const loadTableImmersivePref = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(IMMERSIVE_KEY);
  if (stored === '0') return false;
  if (stored === '1') return true;
  return window.innerWidth <= 767;
};

export const saveTableImmersivePref = (on: boolean) => {
  try {
    localStorage.setItem(IMMERSIVE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};
