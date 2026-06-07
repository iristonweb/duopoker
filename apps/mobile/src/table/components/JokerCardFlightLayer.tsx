import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import type { JokerCardFlight } from '@duopoker/table-client';
import { seatCoordinates } from '@duopoker/table-client';
import { PlayingCard } from './PlayingCard';

type Props = {
  flights: JokerCardFlight[];
  playerIndex: Map<string, number>;
  playerCount: number;
  deckId: string;
};

function FlightCard({
  flight,
  from,
  deckId
}: {
  flight: JokerCardFlight;
  from: { x: number; y: number };
  deckId: string;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 680, easing: Easing.inOut(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }, () => {});
    const t = setTimeout(() => {
      opacity.value = 0;
    }, 760);
    return () => clearTimeout(t);
  }, [flight.id, opacity, progress]);

  const style = useAnimatedStyle(() => {
    const centerX = 50;
    const centerY = 42;
    const x = from.x + (centerX - from.x) * progress.value;
    const y = from.y + (centerY - from.y) * progress.value;
    return {
      opacity: opacity.value,
      left: `${x}%`,
      top: `${y}%`,
      transform: [{ translateX: -20 }, { translateY: -28 }, { scale: 1 - progress.value * 0.08 }]
    };
  });

  return (
    <Animated.View style={[styles.card, style]} pointerEvents="none">
      <PlayingCard card={flight.card} faceUp deckId={deckId} size="xs" />
    </Animated.View>
  );
}

export function JokerCardFlightLayer({ flights, playerIndex, playerCount, deckId }: Props) {
  return (
    <View style={styles.layer} pointerEvents="none">
      {flights.map((flight) => {
        const seatIdx = playerIndex.get(flight.userId);
        if (seatIdx === undefined) return null;
        const pos = seatCoordinates(seatIdx, playerCount);
        return (
          <FlightCard key={flight.id} flight={flight} from={{ x: pos.left, y: pos.top }} deckId={deckId} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 18 },
  card: { position: 'absolute', zIndex: 19 }
});
