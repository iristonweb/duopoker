import { useCallback, useEffect, useState } from 'react';

const PROMPT_KEY = 'duopoker_fullscreen_prompted';

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

async function requestElementFullscreen(el: HTMLElement) {
  const target = el as FullscreenElement;
  if (target.requestFullscreen) {
    await target.requestFullscreen();
    return;
  }
  if (target.webkitRequestFullscreen) {
    await target.webkitRequestFullscreen();
  }
}

async function exitDocumentFullscreen() {
  const doc = document as FullscreenDocument;
  if (doc.fullscreenElement) {
    await doc.exitFullscreen();
    return;
  }
  if (doc.webkitFullscreenElement) {
    await doc.webkitExitFullscreen?.();
  }
}

export function useTableFullscreen(enabled: boolean) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const prompted = sessionStorage.getItem(PROMPT_KEY);
    if (!prompted) setPromptOpen(true);
  }, [enabled]);

  useEffect(() => {
    const doc = document as FullscreenDocument;
    const sync = () =>
      setIsFullscreen(Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    try {
      await requestElementFullscreen(document.documentElement);
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
    try {
      await exitDocumentFullscreen();
    } catch {
      /* ignore */
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
