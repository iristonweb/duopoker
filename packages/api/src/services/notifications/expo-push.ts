import { prisma } from '../../lib/prisma.js';
import type { NotificationPayload } from './types.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type ExpoTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoPushResponse = {
  data?: ExpoTicket[];
};

export const sendExpoPushToUser = async (userId: string, payload: NotificationPayload) => {
  const tokens = await prisma.deviceToken.findMany({ where: { userId } });
  if (!tokens.length) return;

  const messages = tokens.map((row) => ({
    to: row.token,
    sound: payload.sound ?? 'default',
    title: payload.title,
    body: payload.body,
    data: { url: payload.url, type: payload.type, ...(payload.data ?? {}) }
  }));

  let response: Response;
  try {
    response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages)
    });
  } catch {
    return;
  }

  if (!response.ok) return;

  const body = (await response.json().catch(() => null)) as ExpoPushResponse | null;
  const tickets = body?.data ?? [];
  if (!tickets.length) return;

  await Promise.allSettled(
    tickets.map(async (ticket, index) => {
      if (ticket.status !== 'error') return;
      const err = ticket.details?.error ?? ticket.message;
      if (err !== 'DeviceNotRegistered' && err !== 'InvalidCredentials') return;
      const row = tokens[index];
      if (!row) return;
      await prisma.deviceToken.delete({ where: { id: row.id } }).catch(() => undefined);
    })
  );
};
