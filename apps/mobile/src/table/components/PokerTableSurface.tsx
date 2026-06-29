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
import { TurnTimer } from './TurnTimer';
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
  activeUserId?: string;
  activeSecondsLeft?: number | null;
  deckShuffling?: boolean;
  isLandscape?: boolean;
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
  activeUserId,
  activeSecondsLeft = null,
  deckShuffling = false,
  isLandscape = true,
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

      <View style={[styles.feltWrap, isLandscape ? styles.feltWrapLandscape : styles.feltWrapPortrait]}>
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
        {deckShuffling ? (
          <View style={styles.shuffleDeck} pointerEvents="none">
            <PlayingCard faceUp={false} deckId={heroDeckId} size="sm" />
            <PlayingCard faceUp={false} deckId={heroDeckId} size="sm" style={styles.shuffleDeckSecond} />
          </View>
        ) : null}

        <View style={[styles.boardRow, isLandscape && styles.boardRowLandscape]}>
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

        <View style={[styles.potCenter, isLandscape && styles.potCenterLandscape]}>
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

          const showTimer =
            player.isActive &&
            activeUserId === player.userId &&
            activeSecondsLeft !== null &&
            activeSecondsLeft > 0;

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
                  zIndex: player.isWinner ? 22 : player.isActive ? 20 : 10
                }
              ]}
            >
              {player.isWinner ? <View style={styles.winnerGlow} /> : null}
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

              {player.isDealer ? (
                <View style={styles.dealerBadge}>
                  <Text style={styles.dealerText}>D</Text>
                </View>
              ) : null}

              <View style={styles.avatarWrap}>
                {!isHeroSeat && (cards.length > 0 || hiddenCount > 0) ? (
                  <View style={styles.holeCardsPeek} pointerEvents="none">
                    {(cards.length
                      ? cards.slice(0, 2)
                      : Array.from({ length: Math.min(hiddenCount, 2) })
                    ).map((c, ci) => (
                      <PlayingCard
                        key={`peek-${player.userId}-${ci}`}
                        card={typeof c === 'object' ? c : undefined}
                        faceUp={Boolean(player.revealCards && typeof c === 'object' && c)}
                        deckId={deckId}
                        size="xs"
                        style={ci === 1 ? styles.holeCardSecond : styles.holeCardFirst}
                      />
                    ))}
                  </View>
                ) : null}

                {player.isFolded ? (
                  <View style={[styles.statusOverlay, styles.statusOverlayFold]}>
                    <Text style={styles.statusOverlayText}>{t('table.seatOut')}</Text>
                  </View>
                ) : player.isAllIn ? (
                  <View style={[styles.statusOverlay, styles.statusOverlayAllIn]}>
                    <Text style={styles.statusOverlayText}>{t('table.seatAllIn')}</Text>
                  </View>
                ) : null}

                {showTimer ? (
                  <View style={styles.seatTimer}>
                    <TurnTimer secondsLeft={activeSecondsLeft!} size={48} />
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
              </View>

              <View style={styles.stackPill}>
                {!isHeroSeat ? (
                  <Text style={styles.seatName} numberOfLines={1}>
                    {player.name}
                  </Text>
                ) : null}
                <View style={styles.stackRow}>
                  <PokerChipStack chipId={seatChipId} count={Math.min(3, 2 + Math.floor(player.stack / 5000))} />
                  <Text style={styles.stackText}>{player.stack.toLocaleString()}</Text>
                </View>
              </View>

              {roundBet > 0 ? (
                <View style={styles.betPill}>
                  <PokerChip chipId={seatChipId} size="sm" />
                  <Text style={styles.betText}>{roundBet.toLocaleString()}</Text>
                </View>
              ) : null}

              {(cards.length > 0 || hiddenCount > 0) && isHeroSeat ? (
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
    top: '10%'
  },
  feltWrapLandscape: {
    height: '78%',
    left: '5%',
    right: '5%',
    top: '8%'
  },
  feltWrapPortrait: {
    height: '72%',
    top: '12%'
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
    top: '36%',
    left: '6%',
    right: '12%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 12
  },
  boardRowLandscape: {
    top: '34%',
    left: '10%',
    right: '16%'
  },
  shuffleDeck: {
    position: 'absolute',
    top: '14%',
    alignSelf: 'center',
    left: '46%',
    zIndex: 6,
    opacity: 0.9
  },
  shuffleDeckSecond: {
    position: 'absolute',
    left: 8,
    top: 3,
    transform: [{ rotate: '-8deg' }]
  },
  ghostCard: { opacity: 0.72 },
  slotCard: { opacity: 0.5 },
  potCenter: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 14
  },
  potCenterLandscape: {
    top: '14%'
  },
  seatTimer: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center'
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
  winnerGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(232,197,71,0.75)',
    backgroundColor: 'rgba(232,197,71,0.12)'
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
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusOverlay: {
    position: 'absolute',
    top: 4,
    alignSelf: 'center',
    zIndex: 8,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1
  },
  statusOverlayFold: {
    backgroundColor: 'rgba(220,38,38,0.88)',
    borderColor: 'rgba(252,165,165,0.7)'
  },
  statusOverlayAllIn: {
    backgroundColor: 'rgba(124,58,237,0.88)',
    borderColor: 'rgba(196,181,253,0.7)'
  },
  statusOverlayText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  holeCardsPeek: {
    position: 'absolute',
    right: -6,
    top: '22%',
    flexDirection: 'row',
    zIndex: 0
  },
  holeCardFirst: { transform: [{ rotate: '-14deg' }] },
  holeCardSecond: { marginLeft: -10, transform: [{ rotate: '10deg' }] },
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
    alignItems: 'center',
    gap: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 64
  },
  seatName: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    maxWidth: 72,
    textAlign: 'center'
  },
  stackRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stackText: { fontSize: 10, fontWeight: '800', color: '#fcd34d', fontVariant: ['tabular-nums'] },
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
