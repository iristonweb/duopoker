import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors } from '@duopoker/shared-types';
import { useMobileStore } from '../src/state/useMobileStore';
import { mobileTheme } from '../src/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const { userId, connectSocket, socket } = useMobileStore();
  const scale = useSharedValue(1);

  useEffect(() => {
    connectSocket();
  }, [connectSocket]);

  const joinQueue = async () => {
    await Haptics.selectionAsync();
    socket?.emit('queueMatchmaking', { userId, mode: 'HOLDEM', buyIn: 100 });
  };

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <LinearGradient
      colors={[colors.background, colors.surfaceElevated]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.inner}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Poker Duality</Text>
          </View>
          <Text style={styles.title}>
            Duo<Text style={styles.titleAccent}>Poker</Text>
          </Text>
          <Text style={styles.subtitle}>
            Lobby with offline-safe reconnect. Virtual chips only — no real-money gambling.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Matchmaking</Text>
            <Text style={styles.cardHint}>Texas Hold&apos;em · buy-in 100</Text>
          </View>
          <AnimatedPressable
            onPress={joinQueue}
            onPressIn={() => {
              scale.value = withSpring(0.96, { damping: 18, stiffness: 380 });
            }}
            onPressOut={() => {
              scale.value = withSpring(1, { damping: 14, stiffness: 320 });
            }}
            style={[styles.cta, ctaStyle]}
          >
            <LinearGradient
              colors={[colors.goldMuted, colors.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Queue matchmaking</Text>
            </LinearGradient>
          </AnimatedPressable>
          <Text style={styles.legal}>
            Purchases are final. Virtual currency is not convertible to cash.
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const r = mobileTheme.radius;
const s = mobileTheme.spacing;

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  inner: {
    flex: 1,
    paddingHorizontal: s.lg,
    paddingBottom: s.xl,
    justifyContent: 'center',
    gap: s.md
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: s.sm,
    paddingVertical: s.xs,
    borderRadius: r.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    backgroundColor: 'rgba(255, 215, 0, 0.12)'
  },
  badgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase'
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5
  },
  titleAccent: {
    color: colors.gold
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 360
  },
  card: {
    marginTop: s.sm,
    padding: s.md,
    borderRadius: r.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  cardLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600'
  },
  cardHint: {
    marginTop: 4,
    color: colors.emerald,
    fontSize: 13
  },
  cta: {
    marginTop: s.sm,
    borderRadius: r.lg,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  ctaGradient: {
    paddingVertical: s.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  ctaText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700'
  },
  legal: {
    marginTop: s.lg,
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 16
  }
});
