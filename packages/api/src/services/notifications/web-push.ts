import webpush from 'web-push';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config.js';
import type { NotificationPayload } from './types.js';

let configured = false;

const ensureVapid = () => {
  if (configured) return Boolean(config.vapidPublicKey && config.vapidPrivateKey);
  if (!config.vapidPublicKey || !config.vapidPrivateKey) return false;
  webpush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
  configured = true;
  return true;
};

export const getVapidPublicKey = (): string | null => config.vapidPublicKey || null;

export const sendWebPushToUser = async (userId: string, payload: NotificationPayload) => {
  if (!ensureVapid()) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    sound: payload.sound ?? 'invite',
    type: payload.type,
    data: payload.data ?? {}
  });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 }
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
        }
      }
    })
  );
};
