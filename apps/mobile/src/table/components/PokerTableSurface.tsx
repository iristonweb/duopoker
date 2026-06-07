import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import type { Card } from '@duopoker/shared-types/index';
import { gameChipId, resolveEquipped } from '@duopoker/shared-types';
import {
  bubbleOffset,
  isBotUserId,
  seatCoordinates,
  type ChipFlight,
  type JokerCardFlight,
  type SeatActionBubble as SeatBubble
} from '@duopoker/table-client';
import { tableFeltVisual } from '../lib/cosmetics';
import type { TablePlayerVisual } from '../types';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { PokerChip, PokerChipStack } from './PokerChip';
import { PotDisplay } from './PotDisplay';
import { SeatActionBubble } from './SeatActionBubble';
import { ChipFlightLayer } from './ChipFlightLayer';
import { JokerCardFlightLayer } from './JokerCardFlightLayer';
import { JokerTrickPile } from './JokerTrickPile';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  communityCards: Card[];
  boardCardKeys?: string[];
  pot: number;
  street?: string;
  handNumber?: number;
  players?: TablePlayerVisual[];
  heroDeckId?: string;
  heroChipId?: string;
  heroTableFeltId?: string;
  ghostCommunityCards?: Card[];
  showBoardSlots?: boolean;
  seatBubbles?: SeatBubble[];
  chipFlights?: ChipFlight[];
  jokerFlights?: JokerCardFlight[];
  potPulseKey?: number;
  sidePots?: number[];
  foldingUsers?: string[];
  checkRippleUsers?: string[];
  style?: ViewStyle;
};

export function PokerTableSurface({
  communityCards,
  boardCardKeys,
  pot,
  street,
  handNumber = 0,
  players = [],
  heroDeckId = 'deck_classic',
  heroChipId = 'chip_classic',
  heroTableFeltId = 'table_classic',
  ghostCommunityCards = [],
  showBoardSlots = true,
  seatBubbles = [],
  chipFlights = [],
  jokerFlights = [],
  potPulseKey = 0,
  sidePots = [],
  foldingUsers = [],
  checkRippleUsers = [],
  style
}: Props) {
  const { t } = useTranslation();
  const felt = tableFeltVisual(heroTableFeltId);
  const potChipId = gameChipId(heroChipId);
  const showGhostBoard = ghostCommunityCards.length === 5;
  const boardCards = showGhostBoard ? ghostCommunityCards : communityCards;
  const playerIndex = new Map(players.map((p, i) => [p.userId, i]));
  const bubbleByUser = new Map(seatBubbles.map((b) => [b.userId, b]));
  const foldingSet = new Set(foldingUsers);
  const rippleSet = new Set(checkRippleUsers);

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={['#1a1208', '#050508', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={[styles.ambientGlow, { backgroundColor: felt.ambientGlow }]} />

      <View style={styles.feltWrap}>
        <LinearGradient
          colors={[felt.meshColor, '#1a1208']}
          style={[styles.felt, { borderColor: `${felt.rimColor}99` }]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          <View style={styles.feltInnerRing} />
          <View style={styles.feltVignette} />
        </LinearGradient>
      </View>

      <View style={styles.content} pointerEvents="box-none">
        <View style={styles.boardRow}>
          {boardCards.length
            ? boardCards.map((c, i) => (
                <PlayingCard
                  key={boardCardKeys?.[i] ?? `board-${handNumber}-${i}-${c}`}
                  card={c}
                  faceUp
                  deckId={heroDeckId}
                  size="xs"
                  style={showGhostBoard ? styles.ghostCard : undefined}
                />
              ))
            : showBoardSlots
              ? Array.from({ length: 5 }).map((_, i) => (
                  <PlayingCard key={`slot-${i}`} faceUp={false} deckId={heroDeckId} size="xs" style={styles.slotCard} />
                ))
              : null}
        </View>

        <View style={styles.potCenter}>
          <PotDisplay pot={pot} chipId={potChipId} street={street} pulseKey={potPulseKey} sidePots={sidePots} />
        </View>

        <ChipFlightLayer
          flights={chipFlights}
          playerIndex={playerIndex}
          playerCount={players.length}
          chipId={potChipId}
        />
        <JokerCardFlightLayer
          flights={jokerFlights}
          playerIndex={playerIndex}
          playerCount={players.length}
          deckId={heroDeckId}
        />

        {players.map((player, index) => {
          const tier = player.tier ?? 'FREE';
          const equipped =
            player.inventory && player.inventory.length > 0
              ? resolveEquipped(player.equipped, tier, player.inventory)
              : {
                  deck: player.equipped?.deck ?? 'deck_classic',
                  chip: player.equipped?.chip ?? 'chip_classic',
                  frame: player.equipped?.frame ?? 'frame_none',
                  title: player.equipped?.title ?? '',
                  table: player.equipped?.table ?? 'table_classic'
                };
          const deckId = equipped.deck;
          const seatChipId = gameChipId(equipped.chip);
          const cards = player.holeCards ?? [];
          const hiddenCount = player.hiddenCardCount ?? 0;
          const isHeroSeat = player.isHero ?? index === players.length - 1;
          const roundBet = player.roundBet ?? 0;
          const bubble = bubbleByUser.get(player.userId);
          const pos = seatCoordinates(index, players.length);
          const bOff = bubbleOffset(index, players.length);

          return (
            <View
              key={player.userId}
              style={[
                styles.seat,
                {
                  left: `${pos.left}%`,
                  top: `${pos.top}%`,
                  transform: [
                    { translateX: -40 },
                    pos.anchor === 'bottom' ? { translateY: -80 } : { translateY: 0 },
                    ...(player.isActive ? [{ scale: 1.04 }] : [])
                  ],
                  opacity: player.isFolded || foldingSet.has(player.userId) ? 0.5 : 1,
                  zIndex: player.isActive ? 20 : 10
                }
              ]}
            >
              {rippleSet.has(player.userId) ? <View style={styles.checkRipple} /> : null}
              {player.isActive ? <View style={styles.activeGlow} /> : null}
              {bubble ? (
                <SeatActionBubble
                  text={bubble.text}
                  kind={bubble.kind}
                  style={{
                    top: bOff.anchor === 'above' ? -48 + bOff.dy : undefined,
                    bottom: bOff.anchor === 'below' ? -40 - bOff.dy : undefined,
                    left: bOff.anchor === 'left' ? -80 + bOff.dx : bOff.anchor === 'right' ? 60 + bOff.dx : '50%',
                    marginLeft: bOff.anchor === 'above' || bOff.anchor === 'below' ? -40 + bOff.dx : 0
                  }}
                />
              ) : null}

              {player.isFolded ? (
                <View style={styles.statusPill}>
                  <Text style={styles.statusFold}>{t('table.seatOut')}</Text>
                </View>
              ) : player.isAllIn ? (
                <View style={styles.statusPill}>
                  <Text style={styles.statusAllIn}>{t('table.seatAllIn')}</Text>
                </View>
              ) : null}

              {player.isDealer ? (
                <View style={styles.dealerBadge}>
                  <Text style={styles.dealerText}>D</Text>
                </View>
              ) : null}

              <PlayerAvatar
                name={player.name}
                avatarUrl={player.avatar}
                tableStatus={player.tableStatus}
                frameId={equipped.frame}
                tier={tier}
                active={player.isActive}
                folded={player.isFolded}
                isBot={isBotUserId(player.userId)}
                size={isHeroSeat ? 'md' : 'sm'}
              />

              <View style={styles.stackPill}>
                <PokerChipStack chipId={seatChipId} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <Text style={styles.stackText}>{player.stack.toLocaleString()}</Text>
              </View>

              {roundBet > 0 ? (
                <View style={styles.betPill}>
                  <PokerChip chipId={seatChipId} size="sm" />
                  <Text style={styles.betText}>{roundBet.toLocaleString()}</Text>
                </View>
              ) : null}

              {(cards.length > 0 || hiddenCount > 0) && !isHeroSeat ? (
                <View style={styles.holeCards}>
                  {(cards.length
                    ? cards
                    : Array.from({ length: hiddenCount }, () => undefined as Card | undefined)
                  ).map((c, ci) => (
                    <PlayingCard
                      key={`seat-${player.userId}-${ci}`}
                      card={c}
                      faceUp={Boolean(player.revealCards && c)}
                      deckId={deckId}
                      size="xs"
                    />
                  ))}
                </View>
              ) : null}

              {player.tricksWon !== undefined && player.tricksWon > 0 ? (
                <View style={styles.tricksWrap}>
                  <JokerTrickPile count={player.tricksWon} deckId={deckId} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(5,5,8,0.75)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden', backgroundColor: colors.background },
  ambientGlow: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: '8%',
    height: '78%',
    borderRadius: 999,
    opacity: 0.35
  },
  feltWrap: {
    position: 'absolute',
    left: '9%',
    right: '9%',
    top: '10%',
    height: '72%'
  },
  felt: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 3,
    overflow: 'hidden'
  },
  feltInnerRing: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    bottom: '10%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  feltVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 999
  },
  content: { flex: 1 },
  boardRow: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 12
  },
  ghostCard: { opacity: 0.72 },
  slotCard: { opacity: 0.5 },
  potCenter: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12
  },
  seat: {
    position: 'absolute',
    alignItems: 'center',
    width: 80,
    gap: 4
  },
  activeGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(74,222,128,0.55)',
    backgroundColor: 'rgba(74,222,128,0.08)'
  },
  statusPill: {
    position: 'absolute',
    bottom: -4,
    zIndex: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.4)',
    backgroundColor: 'rgba(244,63,94,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  statusFold: { fontSize: 8, fontWeight: '700', color: colors.danger, textTransform: 'uppercase' },
  statusAllIn: { fontSize: 8, fontWeight: '700', color: colors.danger, textTransform: 'uppercase' },
  dealerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    zIndex: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.4)',
    backgroundColor: 'rgba(232,197,71,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dealerText: { fontSize: 9, fontWeight: '700', color: colors.goldLight },
  stackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  stackText: { fontSize: 9, fontWeight: '600', color: colors.emerald, fontVariant: ['tabular-nums'] },
  betPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  betText: { fontSize: 9, fontWeight: '700', color: colors.goldLight, fontVariant: ['tabular-nums'] },
  holeCards: { flexDirection: 'row', gap: 2, marginTop: 2 },
  checkRipple: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(161,161,170,0.45)',
    backgroundColor: 'rgba(161,161,170,0.08)'
  },
  tricksWrap: {
    position: 'absolute',
    left: -24,
    top: '36%',
    zIndex: 3
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    zIndex: 11
  }
});
