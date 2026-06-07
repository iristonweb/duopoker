import { StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { SeatActionKind } from '../lib/seat-action-styles';
import { seatActionIcon, seatActionStyles } from '../lib/seat-action-styles';

type Props = {
  text: string;
  kind?: SeatActionKind;
  style?: ViewStyle;
};

export function SeatActionBubble({ text, kind = 'check', style }: Props) {
  const icon = seatActionIcon[kind];
  const palette = seatActionStyles[kind];

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.bubble,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor
        },
        style
      ]}
    >
      <Text style={[styles.icon, { color: palette.color }]}>{icon}</Text>
      <Text style={[styles.text, { color: palette.color }]} numberOfLines={1}>
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    zIndex: 25,
    minWidth: 56,
    maxWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  icon: { fontSize: 10, opacity: 0.8 },
  text: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }
});
