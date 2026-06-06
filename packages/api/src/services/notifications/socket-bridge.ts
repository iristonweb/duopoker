import { config } from '../../config.js';
import type { NotificationPayload } from './types.js';
import { notificationSocketEvent } from './types.js';

export const emitSocketNotification = async (
  userIds: string[],
  payload: NotificationPayload
): Promise<void> => {
  const base = config.backendInternalUrl?.replace(/\/$/, '');
  const secret = config.notifyInternalSecret;
  if (!base || !secret || userIds.length === 0) return;

  await fetch(`${base}/internal/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`
    },
    body: JSON.stringify({
      userIds,
      event: notificationSocketEvent(payload.type),
      payload
    })
  }).catch(() => undefined);
};
