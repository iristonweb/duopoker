import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { Card } from '@duopoker/shared-types/index';
import { deckBackUrl } from '../lib/cosmetics';

const suitSymbol = (s: string) => (s === 'H' ? '♥' : s === 'D' ? '♦' : s === 'C' ? '♣' : '♠');
const rankLabel = (r: string) => (r === 'T' ? '10' : r);
const isRed = (s: string) => s === 'H' || s === 'D';
const isFace = (r: string) => r === 'A' || r === 'K' || r === 'Q' || r === 'J';

const sizeMap = {
  xs: { width: 34, height: 48, corner: 8, pip: 14, face: 16 },
  sm: { width: 46, height: 64, corner: 9, pip: 18, face: 22 },
  md: { width: 58, height: 81, corner: 10, pip: 22, face: 26 },
  lg: { width: 72, height: 101, corner: 11, pip: 28, face: 32 }
} as const;

function CardFace({ rank, suit, size }: { rank: string; suit: string; size: keyof typeof sizeMap }) {
  const s = sizeMap[size];
  const color = isRed(suit) ? '#dc2626' : '#18181b';
  const sym = suitSymbol(suit);
  const label = rankLabel(rank);

  return (
    <View style={[styles.cardShell, { width: s.width, height: s.height, borderRadius: s.corner * 0.45 }]}>
      <View style={styles.faceShine} />
      <View style={[styles.faceBorder, { borderRadius: s.corner * 0.4 }]} />
      <View style={styles.cornerTL}>
        <Text style={[styles.cornerRank, { fontSize: s.corner, color }]}>{label}</Text>
        <Text style={[styles.cornerSuit, { fontSize: s.corner, color }]}>{sym}</Text>
      </View>
      <View style={styles.centerPip}>
        {isFace(rank) ? (
          <>
            <Text style={[styles.faceRank, { fontSize: s.face, color }]}>{label}</Text>
            <Text style={[styles.faceSuit, { fontSize: s.pip, color }]}>{sym}</Text>
          </>
        ) : (
          <Text style={[styles.pipOnly, { fontSize: s.pip, color }]}>{sym}</Text>
        )}
      </View>
      <View style={[styles.cornerBR, { transform: [{ rotate: '180deg' }] }]}>
        <Text style={[styles.cornerRank, { fontSize: s.corner, color }]}>{label}</Text>
        <Text style={[styles.cornerSuit, { fontSize: s.corner, color }]}>{sym}</Text>
      </View>
    </View>
  );
}

export function PlayingCard({
  card,
  faceUp = true,
  deckId = 'deck_classic',
  style,
  size = 'md'
}: {
  card?: Card;
  faceUp?: boolean;
  deckId?: string;
  style?: ViewStyle;
  size?: keyof typeof sizeMap;
}) {
  const s = sizeMap[size];

  if (!faceUp || !card) {
    return (
      <View style={[styles.cardShell, { width: s.width, height: s.height, borderRadius: s.corner * 0.45 }, style]}>
        <Image source={{ uri: deckBackUrl(deckId) }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={styles.backShine} />
      </View>
    );
  }

  const rank = card[0];
  const suit = card[1];
  return (
    <View style={style}>
      <CardFace rank={rank} suit={suit} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    overflow: 'hidden',
    backgroundColor: '#fdfbf7',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6
  },
  faceShine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)'
  },
  faceBorder: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  backShine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  cornerTL: { position: 'absolute', left: 4, top: 3, alignItems: 'center' },
  cornerBR: { position: 'absolute', right: 4, bottom: 3, alignItems: 'center' },
  cornerRank: { fontWeight: '700', lineHeight: 12 },
  cornerSuit: { lineHeight: 12 },
  centerPip: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  faceRank: { fontWeight: '700' },
  faceSuit: { opacity: 0.9 },
  pipOnly: { fontWeight: '600' }
});
