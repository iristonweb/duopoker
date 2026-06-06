import { Redirect, router, Link } from 'expo-router';
import { useState } from 'react';
import { colors } from '@duopoker/shared-types';
import { useMobileStore } from '../src/state/useMobileStore';
import { mobileTheme } from '../src/theme';

import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const accessToken = useMobileStore((s) => s.accessToken);
  const ready = useMobileStore((s) => s.ready);
  const login = useMobileStore((s) => s.login);
  const authError = useMobileStore((s) => s.authError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (ready && accessToken) {
    return <Redirect href="/lobby" />;
  }

  const onSubmit = async () => {
    setBusy(true);
    const ok = await login(email.trim(), password);
    setBusy(false);
    if (ok) router.replace('/lobby');
  };

  return (
    <LinearGradient colors={[colors.background, colors.surfaceElevated]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <Text style={styles.title}>
            Duo<Text style={styles.titleAccent}>Poker</Text>
          </Text>
          <Text style={styles.subtitle}>Sign in to receive table invites and join club tables.</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={colors.textSubtle}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            secureTextEntry
            placeholder="Password"
            placeholderTextColor={colors.textSubtle}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {authError ? <Text style={styles.error}>Invalid email or password</Text> : null}
          <Pressable disabled={busy} onPress={() => void onSubmit()} style={styles.cta}>
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.ctaText}>Sign in</Text>
            )}
          </Pressable>
          <Link href="https://duopoker.ru/register" asChild>
            <Pressable>
              <Text style={styles.link}>Create account on web</Text>
            </Pressable>
          </Link>
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
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  titleAccent: { color: colors.gold },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  error: { color: '#fca5a5', fontSize: 13 },
  cta: {
    marginTop: s.sm,
    backgroundColor: colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  ctaText: { color: colors.background, fontWeight: '700', fontSize: 16 },
  link: { color: colors.gold, textAlign: 'center', marginTop: s.md, fontSize: 13 }
});
