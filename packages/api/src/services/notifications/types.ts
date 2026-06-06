export type NotificationType = 'VIP_INVITE' | 'TABLE_INVITE' | 'TABLE_LIVE' | 'VIP_TABLE_LIVE';

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  sound?: string;
  data?: Record<string, string>;
};

export const notificationSocketEvent = (type: NotificationType): string => {
  switch (type) {
    case 'VIP_INVITE':
      return 'vipInviteReceived';
    case 'TABLE_INVITE':
      return 'tableInviteReceived';
    case 'TABLE_LIVE':
    case 'VIP_TABLE_LIVE':
      return 'tableLive';
    default:
      return 'notification';
  }
};
