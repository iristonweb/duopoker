import { useCallback, useEffect, useState } from 'react';
import {
  getViewportSize,
  isPhoneLandscapeViewport,
  isPhonePortraitViewport,
  isPhoneViewport,
  subscribeViewportChange,
  type ViewportSize
} from '../lib/table-viewport';

export type TableViewport = ViewportSize & {
  isPhone: boolean;
  isPhonePortrait: boolean;
  isPhoneLandscape: boolean;
};

function readViewport(): TableViewport {
  const { width, height } = getViewportSize();
  return {
    width,
    height,
    isPhone: isPhoneViewport(width, height),
    isPhonePortrait: isPhonePortraitViewport(width, height),
    isPhoneLandscape: isPhoneLandscapeViewport(width, height)
  };
}

function syncBodyViewportDataset(vp: TableViewport) {
  if (typeof document === 'undefined') return;
  document.body.dataset.tablePhone = vp.isPhone ? '1' : '0';
  document.body.dataset.tableOrientation = vp.isPhonePortrait
    ? 'portrait'
    : vp.isPhoneLandscape
      ? 'landscape'
      : 'other';
}

export function useTableViewport(): TableViewport {
  const [viewport, setViewport] = useState<TableViewport>(() => readViewport());

  const sync = useCallback(() => {
    const next = readViewport();
    setViewport(next);
    syncBodyViewportDataset(next);
  }, []);

  useEffect(() => {
    sync();
    return subscribeViewportChange(sync);
  }, [sync]);

  useEffect(() => {
    return () => {
      delete document.body.dataset.tablePhone;
      delete document.body.dataset.tableOrientation;
    };
  }, []);

  return viewport;
}
