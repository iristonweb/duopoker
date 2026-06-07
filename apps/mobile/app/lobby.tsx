import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors } from '@duopoker/shared-types';
import { useMobileStore } from '../src/state/useMobileStore';
import { apiFetch } from '../src/lib/api';
import { strings } from '../src/lib/strings';
import { mobileTheme } from '../src/theme';

type QueueMode = 'HOLDEM' | 'JOKER';
type OpponentType = 'bot' | 'human';

export default function LobbyScreen() {
  const accessToken = useMobileStore((s) => s.accessToken);
  const user = useMobileStore((s) => s.user);
  const logout = useMobileStore((s) => s.logout);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<QueueMode>('HOLDEM');
  const [opponent, setOpponent] = useState<OpponentType>('bot');
  const [jokerStrict, setJokerStrict] = useState(false);
  const [jokerMinus, setJokerMinus] = useState(false);

  const joinQueue = async () => {
    if (!accessToken) return;
    setBusy(true);
    setStatus(strings.lobby.searching);
    await Haptics.selectionAsync();
    try {
      const jokerRules = {
        strictJoker: jokerStrict,
        scoringMode: jokerMinus ? ('minus' as const) : ('classic' as const)
      };
      const body =
        mode === 'JOKER'
          ? {
              mode: 'JOKER',
              buyIn: 100,
              opponent,
              playerCount: 4,
              jokerRules
            }
          : {
              mode: 'HOLDEM',
              buyIn: 100,
              opponent,
              playerCount: 2
            };

      const res = await apiFetch('/game/queue', { method: 'POST', body: JSON.stringify(body) }, accessToken);
      const data = (await res.json()) as { status?: string; sessionId?: string };
      if (data.sessionId) {
        setStatus(strings.lobby.matched);
        router.push(`/table/${data.sessionId}`);
      } else {
        setStatus(
          data.status === 'waiting'
            ? mode === 'JOKER'
              ? strings.lobby.waitingJoker
              : strings.lobby.waiting
            : strings.lobby.queueStarted
        );
      }
    } catch {
      setStatus(strings.lobby.queueFailed);
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
            {strings.lobby.welcome}
            {user?.nickname ? ` @${user.nickname}` : ''}
          </Text>
          <Text style={styles.subtitle}>{strings.lobby.subtitle}</Text>

          <View style={styles.modeRow}>
            {(['HOLDEM', 'JOKER'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={[styles.modeChip, mode === m && styles.modeChipActive]}
              >
                <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                  {m === 'HOLDEM' ? strings.lobby.modeHoldem : strings.lobby.modeJoker}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modeRow}>
            {(['bot', 'human'] as const).map((o) => (
              <Pressable
                key={o}
                onPress={() => setOpponent(o)}
                style={[styles.modeChip, opponent === o && styles.modeChipActive]}
              >
                <Text style={[styles.modeChipText, opponent === o && styles.modeChipTextActive]}>
                  {o === 'bot' ? strings.lobby.opponentBot : strings.lobby.opponentHuman}
                </Text>
              </Pressable>
            ))}
          </View>

          {mode === 'JOKER' ? (
            <View style={styles.jokerOpts}>
              <Text style={styles.jokerHint}>{strings.lobby.jokerFourPlayers}</Text>
              <Pressable onPress={() => setJokerStrict((v) => !v)} style={styles.checkRow}>
                <Text style={styles.checkBox}>{jokerStrict ? '☑' : '☐'}</Text>
                <Text style={styles.checkLabel}>{strings.lobby.jokerStrict}</Text>
              </Pressable>
              <Pressable onPress={() => setJokerMinus((v) => !v)} style={styles.checkRow}>
                <Text style={styles.checkBox}>{jokerMinus ? '☑' : '☐'}</Text>
                <Text style={styles.checkLabel}>{strings.lobby.jokerMinus}</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable disabled={busy} onPress={() => void joinQueue()} style={styles.cta}>
            <Text style={styles.ctaText}>
              {busy
                ? strings.lobby.starting
                : opponent === 'human'
                  ? mode === 'HOLDEM'
                    ? strings.lobby.quickHuman
                    : strings.lobby.quickJokerHuman
                  : mode === 'HOLDEM'
                    ? strings.lobby.quickBot
                    : strings.lobby.quickJokerBot}
            </Text>
          </Pressable>
          {status ? <Text style={styles.status}>{status}</Text> : null}
          <Pressable onPress={() => void logout()} style={styles.logout}>
            <Text style={styles.logoutText}>{strings.lobby.signOut}</Text>
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
  modeRow: { flexDirection: 'row', gap: s.sm },
  modeChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center'
  },
  modeChipActive: { borderColor: colors.gold, backgroundColor: 'rgba(232,197,71,0.12)' },
  modeChipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  modeChipTextActive: { color: colors.gold },
  jokerOpts: { gap: s.xs },
  jokerHint: { color: colors.textSubtle, fontSize: 12, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: s.sm },
  checkBox: { color: colors.emerald, fontSize: 16 },
  checkLabel: { color: colors.textMuted, fontSize: 13, flex: 1 },
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
