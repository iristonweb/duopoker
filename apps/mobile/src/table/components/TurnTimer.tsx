import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  secondsLeft: number;
  totalSeconds?: number;
  size?: number;
  style?: ViewStyle;
};

export function TurnTimer({ secondsLeft, totalSeconds = 45, size = 44, style }: Props) {
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const urgent = secondsLeft <= 10;
  const ringColor = urgent ? colors.danger : colors.gold;

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <View
        style={[
          styles.track,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: 'rgba(255,255,255,0.08)'
          }
        ]}
      />
      <View
        style={[
          styles.progress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: ringColor,
            opacity: 0.35 + progress * 0.65
          }
        ]}
      />
      <Text style={[styles.label, urgent && styles.labelUrgent]}>{secondsLeft}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute',
    borderWidth: 3
  },
  progress: {
    position: 'absolute',
    borderWidth: 3
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: colors.goldLight
  },
  labelUrgent: { color: colors.danger }
});
