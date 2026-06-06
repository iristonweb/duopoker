/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

type PushPayload = {
  title: string;
  body: string;
  url: string;
  type?: string;
  sound?: string;
  data?: Record<string, string>;
};

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

self.addEventListener('push', (event) => {
  const fallback: PushPayload = { title: 'DP CLUB', body: 'New table invitation', url: '/lobby' };
  let data: PushPayload = fallback;
  try {
    data = event.data ? { ...fallback, ...(JSON.parse(event.data.text()) as PushPayload) } : fallback;
  } catch {
    /* use fallback */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: data.type ?? 'duopoker-invite',
      silent: false,
      data: { url: data.url ?? '/lobby', type: data.type }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data?.url as string | undefined) ?? '/lobby';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.focus();
          client.postMessage({ type: 'duopoker-navigate', url: rawUrl });
          return;
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
