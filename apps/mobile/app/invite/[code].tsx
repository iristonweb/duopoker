import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@duopoker/shared-types';
import { acceptInviteRequest } from '../src/lib/api';
import { useMobileStore } from '../src/state/useMobileStore';
import { mobileTheme } from '../src/theme';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const accessToken = useMobileStore((s) => s.accessToken);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken || !code || busy) return;
    setBusy(true);
    void acceptInviteRequest(accessToken, code)
      .then(() => {
        router.replace('/lobby');
        setError(null);
      })
      .catch(() => setError('Could not accept invite'))
      .finally(() => setBusy(false));
  }, [accessToken, code, busy]);

  return (
    <LinearGradient colors={[colors.background, colors.surfaceElevated]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          {busy ? <ActivityIndicator color={colors.gold} size="large" /> : null}
          <Text style={styles.title}>Club invitation</Text>
          <Text style={styles.subtitle}>Code: {code}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={() => router.replace('/lobby')} style={styles.cta}>
            <Text style={styles.ctaText}>Back to lobby</Text>
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
  subtitle: { color: colors.textMuted, fontSize: 14 },
  error: { color: '#fca5a5', fontSize: 13 },
  cta: { marginTop: s.lg, paddingVertical: 12, paddingHorizontal: 20 },
  ctaText: { color: colors.gold, fontWeight: '600' }
});
