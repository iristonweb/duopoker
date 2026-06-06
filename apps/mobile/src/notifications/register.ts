import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE } from '../lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

export async function registerMobilePushToken(accessToken: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('invites', {
      name: 'Table invitations',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 120, 250]
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.slug;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId: String(projectId) } : undefined
  );
  const token = tokenData.data;

  await fetch(`${API_BASE}/notifications/device-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android'
    })
  }).catch(() => undefined);

  return token;
}

export function attachNotificationListeners(
  onNavigate: (url: string) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = (response.notification.request.content.data?.url as string | undefined) ?? '/lobby';
    onNavigate(url.startsWith('/') ? url : `/${url}`);
  });

  const received = Notifications.addNotificationReceivedListener(() => {
    /* foreground — haptic handled by OS sound */
  });

  return () => {
    sub.remove();
    received.remove();
  };
}
