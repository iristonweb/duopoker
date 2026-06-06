import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { attachNotificationListeners } from '../src/notifications/register';
import { useMobileStore } from '../src/state/useMobileStore';
import { colors } from '@duopoker/shared-types';

export default function RootLayout() {
  const router = useRouter();
  const bootstrap = useMobileStore((s) => s.bootstrap);
  const ready = useMobileStore((s) => s.ready);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    return attachNotificationListeners((url) => {
      const path = url.startsWith('/') ? url.slice(1) : url;
      router.push(`/${path}` as never);
    });
  }, [router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
