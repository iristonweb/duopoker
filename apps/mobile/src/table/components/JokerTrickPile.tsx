import { StyleSheet, Text, View } from 'react-native';
import { PlayingCard } from './PlayingCard';

type Props = {
  count: number;
  deckId: string;
};

/** Face-down stack representing tricks won this hand. */
export function JokerTrickPile({ count, deckId }: Props) {
  if (count <= 0) return null;
  const shown = Math.min(count, 4);
  return (
    <View style={styles.wrap}>
      {Array.from({ length: shown }, (_, i) => (
        <View
          key={i}
          style={[
            styles.card,
            {
              transform: [
                { translateX: (i - (shown - 1) / 2) * 4 },
                { rotate: `${(i - 1) * 4}deg` }
              ]
            }
          ]}
        >
          <PlayingCard deckId={deckId} faceUp={false} size="xs" />
        </View>
      ))}
      {count > shown ? (
        <View style={styles.moreBadge}>
          <Text style={styles.moreText}>+{count - shown}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', height: 32, width: 40, alignItems: 'center', justifyContent: 'flex-end' },
  card: { position: 'absolute', bottom: 0 },
  moreBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 999,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  moreText: { fontSize: 8, fontWeight: '700', color: '#fff' }
});
