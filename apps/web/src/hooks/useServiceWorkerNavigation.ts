import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Handle navigation requests from the service worker (notification click). */
export function useServiceWorkerNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | null;
      if (data?.type !== 'duopoker-navigate' || !data.url) return;
      const path = data.url.startsWith('/') ? data.url : `/${data.url}`;
      navigate(path);
    };

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);
}
