import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { gameChipId } from '@duopoker/shared-types';
import { chipImageUrl } from '../lib/cosmetics';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 64
} as const;

export function PokerChip({
  chipId = 'chip_classic',
  amount,
  style,
  size = 'md'
}: {
  chipId?: string;
  amount?: number;
  style?: ViewStyle;
  size?: keyof typeof sizeMap;
}) {
  const dim = sizeMap[size];
  const resolved = gameChipId(chipId);

  return (
    <View style={[styles.wrap, style]}>
      <View style={{ width: dim, height: dim }}>
        <Image
          source={{ uri: chipImageUrl(resolved) }}
          style={{ width: dim, height: dim }}
          contentFit="contain"
        />
      </View>
      {amount != null ? (
        <Text style={styles.amount}>{amount.toLocaleString()}</Text>
      ) : null}
    </View>
  );
}

export function PokerChipStack({
  chipId = 'chip_classic',
  count = 3,
  style
}: {
  chipId?: string;
  count?: number;
  style?: ViewStyle;
}) {
  const resolved = gameChipId(chipId);
  const chips = Math.min(count, 5);
  const uri = chipImageUrl(resolved);

  return (
    <View style={[styles.stack, { height: 44, width: 44 }, style]}>
      {Array.from({ length: chips }, (_, i) => (
        <Image
          key={i}
          source={{ uri }}
          style={[styles.stackChip, { top: i * -3, zIndex: i }]}
          contentFit="contain"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  amount: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.goldLight
  },
  stack: { position: 'relative' },
  stackChip: {
    position: 'absolute',
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 36
  }
});
