import { useEffect, useRef } from 'react';
import {
  saveTableMusicPref,
  startTableMusic,
  stopTableMusic
} from '../lib/table-music';

/** Starts/stops ambient table music; resumes AudioContext on first user gesture if needed. */
export function useTableMusic(enabled: boolean) {
  const startedRef = useRef(false);

  useEffect(() => {
    saveTableMusicPref(enabled);
    if (!enabled) {
      stopTableMusic();
      startedRef.current = false;
      return;
    }

    let cancelled = false;

    const boot = async () => {
      const ok = await startTableMusic();
      if (!cancelled && ok) startedRef.current = true;
    };

    void boot();

    return () => {
      cancelled = true;
      stopTableMusic();
      startedRef.current = false;
    };
  }, [enabled]);
}

export { loadTableMusicPref, loadTableSfxPref, saveTableSfxPref } from '../lib/table-music';
