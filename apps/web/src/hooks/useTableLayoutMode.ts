import { useCallback, useEffect, useState } from 'react';
import {
  getViewportSize,
  isPhoneLandscapeViewport,
  PHONE_MAX_SHORT,
  subscribeViewportChange
} from '../lib/table-viewport';

export type TableLayoutKind = 'desktop' | 'tablet' | 'mobile-classic';

const DESKTOP_MIN = 1280;
const TABLET_MIN = 768;

/**
 * Web table layout: desktop/tablet use ring table; phones always use horizontal
 * ring table (mobile-classic). Portrait phones see orientation gate separately.
 */
export function resolveTableLayoutKind(width: number, height: number): TableLayoutKind {
  const shortSide = Math.min(width, height);
  const isPhone = shortSide <= PHONE_MAX_SHORT;

  if (width >= DESKTOP_MIN) return 'desktop';
  if (isPhone) return 'mobile-classic';
  if (width >= TABLET_MIN) return 'tablet';
  return 'mobile-classic';
}

export function useTableLayoutMode(): TableLayoutKind {
  const [mode, setMode] = useState<TableLayoutKind>(() =>
    typeof window === 'undefined'
      ? 'desktop'
      : resolveTableLayoutKind(getViewportSize().width, getViewportSize().height)
  );

  const sync = useCallback(() => {
    const { width, height } = getViewportSize();
    setMode(resolveTableLayoutKind(width, height));
  }, []);

  useEffect(() => {
    sync();
    const unsubViewport = subscribeViewportChange(sync);
    return unsubViewport;
  }, [sync]);

  useEffect(() => {
    document.body.dataset.tableLayoutMode = mode;
    return () => {
      delete document.body.dataset.tableLayoutMode;
    };
  }, [mode]);

  return mode;
}

export function isPhoneLandscape(width: number, height: number): boolean {
  return isPhoneLandscapeViewport(width, height);
}
