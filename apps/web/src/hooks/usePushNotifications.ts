import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

export type PushSubscribeResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'noVapid' | 'failed' };

const urlBase64ToUint8Array = (base64: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
};

export function usePushNotifications() {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [vapidConfigured, setVapidConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
  }, []);

  useEffect(() => {
    if (!supported || !accessToken) {
      setSubscribed(false);
      setVapidConfigured(null);
      return;
    }
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
        setPermission(Notification.permission);
      } catch {
        setSubscribed(false);
      }
      try {
        const keyRes = await apiFetch('/notifications/vapid-public-key');
        const keyData = (await keyRes.json()) as { publicKey?: string | null };
        setVapidConfigured(Boolean(keyData.publicKey));
      } catch {
        setVapidConfigured(false);
      }
    })();
  }, [supported, accessToken, apiFetch]);

  const subscribe = useCallback(async (): Promise<PushSubscribeResult> => {
    if (!supported) return { ok: false, reason: 'unsupported' };
    if (!accessToken || busy) return { ok: false, reason: 'failed' };
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { ok: false, reason: 'denied' };

      const keyRes = await apiFetch('/notifications/vapid-public-key');
      const keyData = (await keyRes.json()) as { publicKey?: string | null };
      if (!keyData.publicKey) {
        setVapidConfigured(false);
        return { ok: false, reason: 'noVapid' };
      }
      setVapidConfigured(true);

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource
        });
      }

      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, reason: 'failed' };

      const res = await apiFetch('/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
        })
      });
      setSubscribed(res.ok);
      return res.ok ? { ok: true } : { ok: false, reason: 'failed' };
    } catch {
      return { ok: false, reason: 'failed' };
    } finally {
      setBusy(false);
    }
  }, [accessToken, apiFetch, busy, supported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!supported || !accessToken || busy) return false;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const json = sub.toJSON();
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          await apiFetch('/notifications/subscribe', {
            method: 'DELETE',
            body: JSON.stringify({
              endpoint: json.endpoint,
              keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }
            })
          });
        }
        await sub.unsubscribe();
      }
      await apiFetch('/notifications/subscribe/all', { method: 'DELETE' });
      setSubscribed(false);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [accessToken, apiFetch, busy, supported]);

  return { supported, permission, subscribed, vapidConfigured, busy, subscribe, unsubscribe };
}

/** One-time soft prompt after login (lobby). */
export function usePushLoginPrompt() {
  const accessToken = useAppStore((s) => s.accessToken);
  const { supported, subscribed, permission, vapidConfigured, subscribe } = usePushNotifications();

  useEffect(() => {
    if (!accessToken || !supported || subscribed || permission !== 'default') return;
    if (vapidConfigured === false) return;
    try {
      if (localStorage.getItem('duopoker_push_prompted') === '1') return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      void subscribe().then((result) => {
        if (result.ok) localStorage.setItem('duopoker_push_prompted', '1');
      });
    }, 2500);
    return () => clearTimeout(timer);
  }, [accessToken, supported, subscribed, permission, vapidConfigured, subscribe]);
}
