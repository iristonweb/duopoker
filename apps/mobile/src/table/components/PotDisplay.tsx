import { useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { PokerChip, PokerChipStack } from './PokerChip';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  pot: number;
  chipId: string;
  street?: string;
  pulseKey?: number;
  sidePots?: number[];
  style?: ViewStyle;
};

export function PotDisplay({ pot, chipId, street, pulseKey = 0, sidePots = [], style }: Props) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const chipCount = Math.min(6, Math.max(2, 2 + Math.floor(Math.log10(Math.max(10, pot)) * 1.2)));

  useEffect(() => {
    if (pulseKey > 0) {
      scale.value = withSequence(withSpring(1.06), withSpring(1));
    }
  }, [pulseKey, pot, scale]);

  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-4, { duration: 1100 }), withTiming(0, { duration: 1100 })), -1);
  }, [bob]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: bob.value }]
  }));

  return (
    <Animated.View style={[styles.shell, animStyle, style]}>
      <PokerChipStack chipId={chipId} count={chipCount} />
      <PokerChip chipId={chipId} size="sm" />
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>{t('table.potLabel')}</Text>
        <Text style={styles.amount}>{pot.toLocaleString()}</Text>
      </View>
      {street ? (
        <View style={styles.streetBadge}>
          <Text style={styles.streetText}>{street}</Text>
        </View>
      ) : null}
      {sidePots.length > 1 ? (
        <View style={styles.sidePots}>
          {sidePots.map((amount, i) => (
            <Text key={i} style={styles.sidePotLine}>
              {t('table.sidePotShort', { index: i + 1, amount })}
            </Text>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  textCol: { justifyContent: 'center' },
  eyebrow: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(232,197,71,0.75)'
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.goldLight
  },
  streetBadge: {
    marginLeft: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.35)',
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  streetText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: colors.emerald
  },
  sidePots: {
    marginLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 8,
    gap: 2
  },
  sidePotLine: { fontSize: 9, color: colors.textSubtle, fontVariant: ['tabular-nums'] }
});
