import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@duopoker/shared-types';
import { joinSessionRequest } from '../src/lib/api';
import { useMobileStore } from '../src/state/useMobileStore';
import { mobileTheme } from '../src/theme';

const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://duopoker.ru').replace(/\/$/, '');

export default function TableScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const accessToken = useMobileStore((s) => s.accessToken);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !sessionId) return;
    void joinSessionRequest(accessToken, sessionId)
      .then(() => setReady(true))
      .catch(() => setError('Could not join session'));
  }, [accessToken, sessionId]);

  const openWebTable = () => {
    void Linking.openURL(`${WEB_BASE}/table/${sessionId}`);
  };

  return (
    <LinearGradient colors={[colors.background, colors.surfaceElevated]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <Text style={styles.title}>Table {sessionId?.slice(0, 8)}</Text>
          {!ready && !error ? <ActivityIndicator color={colors.gold} /> : null}
          {ready ? (
            <Text style={styles.subtitle}>You are seated. Full 3D table UI is on web for now.</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={openWebTable} style={styles.cta}>
            <Text style={styles.ctaText}>Open table in browser</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/lobby')}>
            <Text style={styles.link}>Back to lobby</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const s = mobileTheme.spacing;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: s.lg, gap: s.md },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 13 },
  cta: {
    marginTop: s.md,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24
  },
  ctaText: { color: colors.background, fontWeight: '700' },
  link: { color: colors.gold, marginTop: s.lg }
});
