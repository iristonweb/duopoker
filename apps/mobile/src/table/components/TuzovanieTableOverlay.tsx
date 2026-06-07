import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Card, SessionState } from '@duopoker/shared-types/index';
import { useTranslation } from 'react-i18next';
import { formatCardLabel, rotatePlayersForHero, seatCoordinates } from '@duopoker/table-client';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { PlayingCard } from './PlayingCard';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;
const STAGGER_MS = 450;

type Props = {
  session: SessionState;
  heroId: string;
  deckId: string;
  label: (uid: string) => string;
  reduceMotion?: boolean;
};

export function TuzovanieTableOverlay({ session, heroId, deckId, label, reduceMotion }: Props) {
  const { t } = useTranslation();
  const log = session.joker?.tuzovanieLog;
  const active =
    session.mode === 'JOKER' &&
    session.handNumber === 1 &&
    log &&
    log.length > 0 &&
    (session.street === 'BIDDING' || session.street === 'TRUMP_CHOICE' || session.street === 'LOBBY');

  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active || !log?.length) {
      setRevealed(0);
      return;
    }
    setRevealed(0);
    if (reduceMotion) {
      setRevealed(log.length);
      return;
    }
    const timers = log.map((_, i) => setTimeout(() => setRevealed(i + 1), i * STAGGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [active, log, reduceMotion, session.sessionId]);

  const seatIndex = useMemo(() => {
    const order = rotatePlayersForHero(
      session.players.map((userId) => ({ userId })),
      heroId
    );
    return new Map(order.map((p, i) => [p.userId, i]));
  }, [session.players, heroId]);

  if (!active || !log) return null;

  const visible = log.slice(0, revealed);
  const last = visible[visible.length - 1];

  return (
    <View style={styles.layer} pointerEvents="none">
      {visible.map((entry, i) => {
        const idx = seatIndex.get(entry.userId) ?? 0;
        const pos = seatCoordinates(idx, session.players.length);
        return (
          <Animated.View
            key={`${entry.userId}-${i}-${entry.card}`}
            entering={reduceMotion ? undefined : ZoomIn.duration(280)}
            style={[
              styles.seatReveal,
              {
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                transform: [{ translateX: -30 }, { translateY: -20 }]
              }
            ]}
          >
            <PlayingCard card={entry.card as Card} deckId={deckId} size="sm" />
            <View style={styles.namePill}>
              <Text style={styles.nameText}>{label(entry.userId)}</Text>
            </View>
          </Animated.View>
        );
      })}
      {last && revealed >= log.length ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.banner}>
          <Text style={styles.bannerText}>
            {t('table.feedJokerTuzovanieDealer', { name: label(session.players[session.dealerIndex]!) })}
            {' — '}
            {formatCardLabel(last.card as Card, t)}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 18 },
  seatReveal: { position: 'absolute', alignItems: 'center', gap: 4 },
  namePill: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  nameText: { fontSize: 9, color: colors.goldLight },
  banner: {
    position: 'absolute',
    bottom: '18%',
    left: 24,
    right: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  bannerText: { fontSize: 12, color: colors.goldLight, textAlign: 'center' }
});
