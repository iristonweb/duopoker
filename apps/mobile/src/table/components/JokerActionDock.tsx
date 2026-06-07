import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Card, GameStreet, JokerDeclaration, JokerHandState, Suit } from '@duopoker/shared-types/index';
import {
  isJokerCard,
  isNominalTrumpBanned,
  jokerLegalPlays,
  leadSuitFromTrick
} from '@duopoker/shared-types/index';
import { formatCardLabel, formatTableError, jokerTrumpDisplay, suitLabel } from '@duopoker/table-client';
import { PlayingCard } from './PlayingCard';
import { TurnTimer } from './TurnTimer';
import { tableHaptic } from '../lib/table-haptics';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;
const PENDING_ACTION_TIMEOUT_MS = 3000;
const TRUMP_SUITS: Suit[] = ['S', 'H', 'D', 'C'];

type Props = {
  myTurn: boolean;
  street: GameStreet;
  holeCards: Card[];
  deckId: string;
  joker: JokerHandState;
  bidAmount: number;
  maxBid: number;
  userId: string;
  dealerId: string;
  playerIds: string[];
  onBidAmountChange: (n: number) => void;
  secondsLeft: number | null;
  activeLabel: string;
  isHeroActive: boolean;
  lastActionText?: string;
  sessionError?: string | null;
  actionLogLen: number;
  strictJoker?: boolean;
  onBid: () => void;
  onPlayCard: (card: Card, declaration?: JokerDeclaration) => void;
  onChooseTrump: (trumpSuit: Suit | null) => void;
};

export function JokerActionDock({
  myTurn,
  street,
  holeCards,
  deckId,
  joker,
  bidAmount,
  maxBid,
  userId,
  dealerId,
  playerIds,
  onBidAmountChange,
  secondsLeft,
  activeLabel,
  isHeroActive,
  lastActionText,
  sessionError,
  actionLogLen,
  strictJoker = false,
  onBid,
  onPlayCard,
  onChooseTrump
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingBid, setPendingBid] = useState(false);
  const [declarationCard, setDeclarationCard] = useState<Card | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY';
  const bidding = street === 'BIDDING';
  const trumpChoice = street === 'TRUMP_CHOICE';
  const showHand = street === 'BIDDING' || street === 'TRICKS' || trumpChoice;
  const trump = jokerTrumpDisplay(joker, t);
  const clampedBid = Math.min(maxBid, Math.max(0, bidAmount));
  const isDealer = userId === dealerId;
  const othersBidSum = playerIds
    .filter((p) => p !== dealerId)
    .reduce((s, p) => s + (joker.bids[p] ?? 0), 0);
  const dealerBidBlocked =
    isDealer &&
    bidding &&
    playerIds.every((p) => p === dealerId || joker.bids[p] !== undefined) &&
    othersBidSum + clampedBid === joker.cardsThisDeal;
  const isLeadingTrick = joker.currentTrick.length === 0;
  const nominalTrumpBlocked = (card: Card) =>
    isNominalTrumpBanned(card, joker.trumpSuit, joker.voidTrumpDiscards);

  const legalCards = useMemo(() => {
    if (bidding || trumpChoice || !showActions) return new Set<string>();
    const lead = leadSuitFromTrick(joker.currentTrick);
    return new Set(jokerLegalPlays(holeCards, lead, joker.trumpSuit, strictJoker));
  }, [bidding, trumpChoice, showActions, holeCards, joker.currentTrick, joker.trumpSuit, strictJoker]);

  const clearPendingTimer = () => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  };

  useEffect(() => {
    setPendingCard(null);
    setPendingBid(false);
    setDeclarationCard(null);
    clearPendingTimer();
  }, [holeCards.length, joker.trickNumber, sessionError, actionLogLen, street]);

  useEffect(() => () => clearPendingTimer(), []);

  const handlePlay = (card: Card, declaration?: JokerDeclaration) => {
    if (pendingCard || !legalCards.has(card)) return;
    void tableHaptic('medium');
    setPendingCard(card);
    setDeclarationCard(null);
    clearPendingTimer();
    pendingTimerRef.current = setTimeout(() => setPendingCard(null), PENDING_ACTION_TIMEOUT_MS);
    onPlayCard(card, declaration);
  };

  const handleCardPress = (card: Card) => {
    if (isJokerCard(card)) {
      setDeclarationCard(card);
      return;
    }
    handlePlay(card);
  };

  const handleBid = () => {
    if (pendingBid) return;
    void tableHaptic('heavy');
    setPendingBid(true);
    clearPendingTimer();
    pendingTimerRef.current = setTimeout(() => setPendingBid(false), PENDING_ACTION_TIMEOUT_MS);
    onBid();
  };

  return (
    <View style={[styles.shell, showActions && styles.shellActive, { paddingBottom: Math.max(12, insets.bottom) }]}>
      {sessionError ? (
        <Text style={styles.error}>{formatTableError(sessionError, t)}</Text>
      ) : null}

      <Text style={styles.metaLine} numberOfLines={1}>
        {t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })} · {trump.line}
      </Text>

      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          {showActions ? (
            <Text style={styles.prompt}>
              {trumpChoice
                ? t('table.jokerTrumpChoicePrompt')
                : bidding
                  ? t('table.jokerBidPrompt')
                  : t('table.jokerPlayPrompt')}
            </Text>
          ) : (
            <>
              <Text style={styles.waiting} numberOfLines={1}>
                {t('table.toAct')}{' '}
                <Text style={isHeroActive ? styles.activeName : styles.otherName}>{activeLabel}</Text>
              </Text>
              {lastActionText ? (
                <Text style={styles.lastAction} numberOfLines={1}>
                  {t('table.lastAction')}: {lastActionText}
                </Text>
              ) : null}
            </>
          )}
        </View>
        {secondsLeft !== null && showActions ? <TurnTimer secondsLeft={secondsLeft} size={40} /> : null}
      </View>

      {showActions && trumpChoice ? (
        <View style={styles.trumpRow}>
          {TRUMP_SUITS.map((suit) => (
            <Pressable
              key={suit}
              style={({ pressed }) => [styles.chipBtn, pressed && styles.pressed]}
              onPress={() => {
                void tableHaptic('heavy');
                onChooseTrump(suit);
              }}
            >
              <Text style={styles.chipBtnText}>{suitLabel(suit, t)}</Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.chipBtn, styles.chipBtnPrimary, pressed && styles.pressed]}
            onPress={() => {
              void tableHaptic('heavy');
              onChooseTrump(null);
            }}
          >
            <Text style={[styles.chipBtnText, styles.chipBtnTextPrimary]}>{t('table.jokerTrumpNoTrump')}</Text>
          </Pressable>
        </View>
      ) : null}

      {showActions && bidding && dealerBidBlocked ? (
        <Text style={styles.hint}>{t('table.jokerDealerBidHint')}</Text>
      ) : null}

      {showActions && bidding ? (
        <View style={styles.bidShell}>
          <Pressable style={styles.stepBtn} onPress={() => onBidAmountChange(Math.max(0, clampedBid - 1))}>
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <View style={styles.bidValueWrap}>
            <Text style={styles.bidValue}>{clampedBid}</Text>
          </View>
          <Pressable style={styles.stepBtn} onPress={() => onBidAmountChange(Math.min(maxBid, clampedBid + 1))}>
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
          <Pressable
            style={[styles.bidSubmit, (pendingBid || dealerBidBlocked) && styles.disabled]}
            disabled={pendingBid || dealerBidBlocked}
            onPress={handleBid}
          >
            <Text style={styles.bidSubmitText}>
              {pendingBid ? t('table.submittingBid') : t('table.jokerBid', { amount: clampedBid })}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {declarationCard ? (
        <View style={styles.declPanel}>
          <Text style={styles.declTitle}>{t('table.jokerDeclarationTitle')}</Text>
          {nominalTrumpBlocked(declarationCard) ? (
            <Text style={styles.declHint}>{t('table.errors.nominalTrumpBanned')}</Text>
          ) : null}
          <View style={styles.declRow}>
            {(['nominal', 'senior', 'minor'] as const)
              .filter((mode) => mode !== 'nominal' || !nominalTrumpBlocked(declarationCard))
              .map((mode) => (
                <Pressable
                  key={mode}
                  style={styles.chipBtn}
                  onPress={() => handlePlay(declarationCard, mode)}
                >
                  <Text style={styles.chipBtnText}>
                    {t(
                      mode === 'nominal'
                        ? 'table.jokerDeclNominal'
                        : mode === 'senior'
                          ? 'table.jokerDeclSenior'
                          : 'table.jokerDeclMinor'
                    )}
                  </Text>
                </Pressable>
              ))}
            {isLeadingTrick
              ? TRUMP_SUITS.flatMap((suit) => [
                  <Pressable
                    key={`lead-hi-${suit}`}
                    style={styles.chipBtn}
                    onPress={() => handlePlay(declarationCard, { suit, rankMode: 'senior' })}
                  >
                    <Text style={styles.chipBtnText}>
                      {t('table.jokerDeclLeadSuit', { suit: suitLabel(suit, t) })}
                    </Text>
                  </Pressable>,
                  <Pressable
                    key={`lead-lo-${suit}`}
                    style={styles.chipBtn}
                    onPress={() => handlePlay(declarationCard, { suit, rankMode: 'minor' })}
                  >
                    <Text style={styles.chipBtnText}>
                      {t('table.jokerDeclLeadSuitLow', { suit: suitLabel(suit, t) })}
                    </Text>
                  </Pressable>
                ])
              : null}
            <Pressable style={styles.chipBtn} onPress={() => setDeclarationCard(null)}>
              <Text style={styles.chipBtnText}>{t('table.fold')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showHand ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
          {holeCards.length === 0 ? (
            <Text style={styles.noCards}>{t('table.jokerNoCards')}</Text>
          ) : (
            holeCards.map((c, i) => {
              const playable = showActions && !bidding && !trumpChoice && legalCards.has(c);
              return (
                <Pressable
                  key={`${joker.trickNumber}-${i}-${c}`}
                  disabled={!playable || pendingCard === c}
                  onPress={() => handleCardPress(c)}
                  style={[styles.cardTap, playable && styles.cardPlayable, !playable && showActions && !bidding && !trumpChoice && styles.cardDisabled]}
                  accessibilityLabel={t('table.playCardLabel', { card: formatCardLabel(c, t) })}
                >
                  <PlayingCard card={c} faceUp deckId={deckId} size="sm" />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      ) : null}

      {!showActions && !lastActionText && showHand ? (
        <Text style={styles.spectate}>{t('table.waitingOpponent')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(5,5,8,0.95)',
    paddingHorizontal: 12,
    paddingTop: 10
  },
  shellActive: {
    borderTopColor: 'rgba(232,197,71,0.45)',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  error: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: 'rgba(244,63,94,0.1)',
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  metaLine: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerText: { flex: 1, minWidth: 0, marginRight: 8 },
  prompt: { fontSize: 12, fontWeight: '600', color: 'rgba(232,197,71,0.85)', textTransform: 'uppercase' },
  waiting: { fontSize: 13, color: colors.textMuted },
  activeName: { color: colors.goldLight, fontWeight: '600' },
  otherName: { color: '#e4e4e7', fontWeight: '600' },
  lastAction: { marginTop: 4, fontSize: 13, color: colors.ivory },
  trumpRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chipBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  chipBtnPrimary: { backgroundColor: 'rgba(232,197,71,0.15)', borderColor: 'rgba(232,197,71,0.35)' },
  chipBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase' },
  chipBtnTextPrimary: { color: colors.goldLight },
  pressed: { opacity: 0.8 },
  hint: { fontSize: 11, color: 'rgba(253,164,175,0.9)', marginBottom: 8 },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bidShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 8
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)',
    backgroundColor: 'rgba(232,197,71,0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBtnText: { fontSize: 18, color: colors.goldLight, fontWeight: '600' },
  bidValueWrap: {
    minWidth: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(232,197,71,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  bidValue: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.goldLight },
  bidSubmit: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(232,197,71,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  bidSubmitText: { fontSize: 13, fontWeight: '600', color: colors.goldLight },
  disabled: { opacity: 0.5 },
  declPanel: {
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
    backgroundColor: 'rgba(139,92,246,0.12)',
    padding: 10,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12
  },
  declTitle: { fontSize: 11, fontWeight: '600', color: '#ddd6fe', textTransform: 'uppercase', marginBottom: 8 },
  declHint: { fontSize: 11, color: '#fde68a', marginBottom: 6 },
  declRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  handRow: { gap: 8, paddingBottom: 4 },
  cardTap: { borderRadius: 8 },
  cardPlayable: { borderWidth: 2, borderColor: 'rgba(232,197,71,0.5)' },
  cardDisabled: { opacity: 0.4 },
  noCards: { fontSize: 13, color: colors.textMuted },
  spectate: { textAlign: 'center', fontSize: 13, color: colors.textSubtle, paddingVertical: 6 }
});
