import { sendExpoPushToUser } from './expo-push.js';
import { emitSocketNotification } from './socket-bridge.js';
import { sendWebPushToUser } from './web-push.js';
import type { NotificationPayload } from './types.js';

export const dispatchNotification = async (userIds: string[], payload: NotificationPayload) => {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;

  await Promise.allSettled([
    emitSocketNotification(unique, payload),
    ...unique.map((userId) => sendWebPushToUser(userId, payload)),
    ...unique.map((userId) => sendExpoPushToUser(userId, payload))
  ]);
};

export const notifyVipInvite = async (
  userIds: string[],
  opts: { hostName: string; hostNick: string; mode: string; buyIn: number; message?: string | null }
) => {
  await dispatchNotification(userIds, {
    type: 'VIP_INVITE',
    title: 'DP CLUB — VIP invitation',
    body: `@${opts.hostNick} invited you · ${opts.mode} · ${opts.buyIn.toLocaleString()} chips`,
    url: '/lobby',
    sound: 'invite',
    data: { hostNick: opts.hostNick }
  });
};

export const notifyVipTableLive = async (
  userIds: string[],
  opts: { sessionId: string; mode: string; buyIn: number }
) => {
  await dispatchNotification(userIds, {
    type: 'VIP_TABLE_LIVE',
    title: 'VIP table is live',
    body: `${opts.mode} table started — join now`,
    url: `/table/${opts.sessionId}`,
    sound: 'invite',
    data: { sessionId: opts.sessionId }
  });
};

export const notifyTableInvite = async (
  userId: string,
  opts: {
    clubName: string;
    tableName: string;
    inviteCode: string;
    hostNick: string;
  }
) => {
  await dispatchNotification([userId], {
    type: 'TABLE_INVITE',
    title: 'Table invitation',
    body: `@${opts.hostNick} invited you to ${opts.tableName} · ${opts.clubName}`,
    url: `/invite/${opts.inviteCode}`,
    sound: 'invite',
    data: { inviteCode: opts.inviteCode }
  });
};

export const notifyTableLive = async (
  userIds: string[],
  opts: { sessionId: string; tableName: string; clubId: string; tableId: string }
) => {
  await dispatchNotification(userIds, {
    type: 'TABLE_LIVE',
    title: 'Your table is live',
    body: `${opts.tableName} has started`,
    url: `/table/${opts.sessionId}`,
    sound: 'invite',
    data: { sessionId: opts.sessionId, clubId: opts.clubId, tableId: opts.tableId }
  });
};
