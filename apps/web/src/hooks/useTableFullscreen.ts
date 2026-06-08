import { useCallback, useEffect, useState } from 'react';

const PROMPT_KEY = 'duopoker_fullscreen_prompted';

export function useTableFullscreen(enabled: boolean) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const prompted = sessionStorage.getItem(PROMPT_KEY);
    if (!prompted) setPromptOpen(true);
  }, [enabled]);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    sync();
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* Safari / unsupported */
    }
    sessionStorage.setItem(PROMPT_KEY, '1');
    setPromptOpen(false);
  }, []);

  const dismissPrompt = useCallback(() => {
    sessionStorage.setItem(PROMPT_KEY, '1');
    setPromptOpen(false);
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  }, []);

  return {
    promptOpen,
    isFullscreen,
    enterFullscreen,
    dismissPrompt,
    exitFullscreen,
    closePrompt: dismissPrompt
  };
}
