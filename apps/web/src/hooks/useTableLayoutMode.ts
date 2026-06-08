import { useCallback, useEffect, useState } from 'react';
import { loadTableImmersivePref } from '../lib/table-layout-prefs';

export type TableLayoutKind = 'desktop' | 'tablet' | 'mobile-immersive' | 'mobile-classic';

const DESKTOP_MIN = 1280;
const TABLET_MIN = 768;

export function resolveTableLayoutKind(
  width: number,
  height: number,
  immersivePref: boolean
): TableLayoutKind {
  const shortSide = Math.min(width, height);
  const isPhone = shortSide <= 767;
  const isLandscape = width > height;

  if (width >= DESKTOP_MIN) return 'desktop';
  // Phone landscape: ring table (PokerTable3D compact) — immersive UI is portrait-only.
  if (isPhone && isLandscape) return 'mobile-classic';
  if (isPhone) return immersivePref ? 'mobile-immersive' : 'mobile-classic';
  if (width >= TABLET_MIN) return 'tablet';
  return immersivePref ? 'mobile-immersive' : 'mobile-classic';
}

export function useTableLayoutMode(): TableLayoutKind {
  const [mode, setMode] = useState<TableLayoutKind>(() =>
    typeof window === 'undefined'
      ? 'desktop'
      : resolveTableLayoutKind(
          window.innerWidth,
          window.innerHeight,
          loadTableImmersivePref()
        )
  );

  const sync = useCallback(() => {
    setMode(
      resolveTableLayoutKind(
        window.innerWidth,
        window.innerHeight,
        loadTableImmersivePref()
      )
    );
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('duopoker:table-layout-pref', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('duopoker:table-layout-pref', sync);
    };
  }, [sync]);

  useEffect(() => {
    document.body.dataset.tableLayoutMode = mode;
    return () => {
      delete document.body.dataset.tableLayoutMode;
    };
  }, [mode]);

  return mode;
}

export function notifyTableLayoutPrefChange() {
  window.dispatchEvent(new Event('duopoker:table-layout-pref'));
}
