import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@duopoker/shared-types';
import { useMobileStore } from '../src/state/useMobileStore';
import { apiFetch } from '../src/lib/api';
import { mobileTheme } from '../src/theme';

export default function LobbyScreen() {
  const accessToken = useMobileStore((s) => s.accessToken);
  const user = useMobileStore((s) => s.user);
  const logout = useMobileStore((s) => s.logout);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const joinQueue = async () => {
    if (!accessToken) return;
    setBusy(true);
    setStatus('Searching for opponents…');
    await Haptics.selectionAsync();
    try {
      const res = await apiFetch(
        '/game/queue',
        { method: 'POST', body: JSON.stringify({ mode: 'HOLDEM', buyIn: 100, opponent: 'bot' }) },
        accessToken
      );
      const data = (await res.json()) as { status?: string; sessionId?: string };
      if (data.sessionId) {
        setStatus('Matched!');
        router.push(`/table/${data.sessionId}`);
      } else {
        setStatus(data.status === 'waiting' ? 'Waiting in queue…' : 'Queue started');
      }
    } catch {
      setStatus('Queue failed — check API URL');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.surfaceElevated]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <Text style={styles.badge}>DP CLUB</Text>
          <Text style={styles.title}>
            Welcome{user?.nickname ? ` @${user.nickname}` : ''}
          </Text>
          <Text style={styles.subtitle}>Virtual chips only — practice Hold&apos;em vs bot or open invites from push.</Text>
          <Pressable disabled={busy} onPress={() => void joinQueue()} style={styles.cta}>
            <Text style={styles.ctaText}>{busy ? 'Starting…' : 'Quick bot table'}</Text>
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable onPress={() => void logout()} style={styles.logout}>
            <Text style={styles.logoutText}>Sign out</Text>
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
  inner: { flex: 1, justifyContent: 'center', padding: s.lg, gap: s.md },
  badge: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  cta: {
    marginTop: s.sm,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  ctaText: { color: colors.background, fontWeight: '700', fontSize: 16 },
  status: { color: colors.emerald, fontSize: 13 },
  logout: { marginTop: s.xl, alignItems: 'center' },
  logoutText: { color: colors.textSubtle, fontSize: 13 }
});
