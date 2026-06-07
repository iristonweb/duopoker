import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import type { ChipFlight } from '@duopoker/table-client';
import { PokerChip } from './PokerChip';

type Props = {
  flights: ChipFlight[];
  playerIndex: Map<string, number>;
  playerCount: number;
  chipId: string;
  onFlightDone?: (id: string) => void;
};

const sidePotAnchor = (potIndex: number, potCount: number): { x: number; y: number } => {
  const center = { x: 50, y: 50 };
  if (potCount <= 1) return center;
  const offsets = [
    { x: -10, y: -6 },
    { x: 10, y: -6 },
    { x: -10, y: 8 },
    { x: 10, y: 8 },
    { x: 0, y: -12 },
    { x: 0, y: 12 }
  ];
  const off = offsets[potIndex % offsets.length] ?? offsets[0]!;
  return { x: center.x + off.x, y: center.y + off.y };
};

const seatAnchor = (index: number, total: number): { x: number; y: number } => {
  if (total <= 2) return index === 0 ? { x: 50, y: 8 } : { x: 50, y: 92 };
  const anchors = [
    { x: 50, y: 6 },
    { x: 92, y: 24 },
    { x: 90, y: 72 },
    { x: 50, y: 94 },
    { x: 10, y: 72 },
    { x: 10, y: 24 }
  ];
  return anchors[index % anchors.length] ?? anchors[0]!;
};

function ChipFlightSprite({
  flight,
  from,
  to,
  chipId,
  onDone
}: {
  flight: ChipFlight;
  from: { x: number; y: number };
  to: { x: number; y: number };
  chipId: string;
  onDone?: () => void;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.45);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 120 });
    scale.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, { duration: 720, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) {
        opacity.value = withTiming(0, { duration: 180 });
        if (onDone) runOnJS(onDone)();
      }
    });
  }, [flight.id, onDone, opacity, progress, scale]);

  const style = useAnimatedStyle(() => {
    const x = from.x + (to.x - from.x) * progress.value;
    const y = from.y + (to.y - from.y) * progress.value;
    return {
      opacity: opacity.value,
      transform: [{ translateX: -18 }, { translateY: -18 }, { scale: scale.value }],
      left: `${x}%`,
      top: `${y}%`
    };
  });

  return (
    <Animated.View style={[styles.chip, style]} pointerEvents="none">
      <PokerChip chipId={chipId} size="sm" />
    </Animated.View>
  );
}

export function ChipFlightLayer({ flights, playerIndex, playerCount, chipId, onFlightDone }: Props) {
  const potCount = Math.max(1, ...flights.map((f) => (f.potIndex ?? 0) + 1));

  return (
    <View style={styles.layer} pointerEvents="none">
      {flights.map((flight) => {
        const seatIdx = playerIndex.get(flight.userId);
        if (seatIdx === undefined) return null;
        const fromSeat = seatAnchor(seatIdx, playerCount);
        const pot = sidePotAnchor(flight.potIndex ?? 0, potCount);
        const toPot = flight.kind === 'toPot';
        const fromPt = toPot ? fromSeat : pot;
        const toPt = toPot ? pot : fromSeat;

        return (
          <ChipFlightSprite
            key={flight.id}
            flight={flight}
            from={fromPt}
            to={toPt}
            chipId={chipId}
            onDone={onFlightDone ? () => onFlightDone(flight.id) : undefined}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 15 },
  chip: { position: 'absolute', zIndex: 16 }
});
