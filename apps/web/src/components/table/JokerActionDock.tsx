import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';
import type { Card, GameStreet, JokerDeclaration, JokerHandState, Suit } from '@duopoker/shared-types/index';
import {
  isJokerCard,
  isNominalTrumpBanned,
  jokerLegalPlays,
  leadSuitFromTrick
} from '@duopoker/shared-types/index';
import { formatCardLabel, jokerTrumpDisplay, suitLabel } from '../../lib/joker-labels';
import { formatTableError } from '../../lib/table-errors';
import { tableHaptic } from '../../lib/table-haptics';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { JokerTrumpBadge } from './JokerTrumpBadge';
import { TurnTimer } from './TurnTimer';

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
    tableHaptic('medium');
    setPendingCard(card);
    setDeclarationCard(null);
    clearPendingTimer();
    pendingTimerRef.current = setTimeout(() => setPendingCard(null), PENDING_ACTION_TIMEOUT_MS);
    onPlayCard(card, declaration);
  };

  const handleCardClick = (card: Card) => {
    if (isJokerCard(card)) {
      setDeclarationCard(card);
      return;
    }
    handlePlay(card);
  };

  const handleBid = () => {
    if (pendingBid) return;
    tableHaptic('heavy');
    setPendingBid(true);
    clearPendingTimer();
    pendingTimerRef.current = setTimeout(() => setPendingBid(false), PENDING_ACTION_TIMEOUT_MS);
    onBid();
  };

  const handleTrump = (suit: Suit | null) => {
    tableHaptic('heavy');
    onChooseTrump(suit);
  };

  return (
    <motion.footer
      data-testid="table-action-dock"
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'glass-shine relative z-40 shrink-0 border-t bg-background/92 backdrop-blur-xl',
        showActions ? 'border-gradient-gold border-gold/35 shadow-glow-gold table-action-segment-active' : 'border-white/10'
      )}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {showActions ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      ) : null}
      <div className="mx-auto max-w-6xl px-3 py-2.5 max-sm:landscape:py-1.5 sm:px-5 sm:py-4">
        {sessionError ? (
          <p className="mb-2 rounded-lg border border-rose/30 bg-rose/10 px-3 py-1.5 text-xs text-rose">
            {formatTableError(sessionError, t)}
          </p>
        ) : null}

        <div className="mb-2 hidden flex-wrap items-center justify-between gap-2 text-xs text-muted sm:flex sm:text-sm">
          <span>
            {t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })}
          </span>
          <span>{trump.line}</span>
          {joker.currentTrick.length > 0 ? (
            <span className="text-gold-light/90">
              {t('table.jokerTrick', { n: joker.trickNumber + 1 })}
            </span>
          ) : null}
        </div>
        <div className="mb-2 flex justify-center md:hidden max-sm:landscape:mb-1">
          <JokerTrumpBadge joker={joker} showHint={bidding && trump.noTrump} size="sm" />
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 max-sm:landscape:mb-1">
          <div className="min-w-0">
            {showActions ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/85 sm:text-sm">
                {trumpChoice
                  ? t('table.jokerTrumpChoicePrompt')
                  : bidding
                    ? t('table.jokerBidPrompt')
                    : t('table.jokerPlayPrompt')}
              </p>
            ) : (
              <div className="space-y-1">
                <p className="truncate text-sm text-muted">
                  {t('table.toAct')}{' '}
                  <span className={cn('font-medium', isHeroActive ? 'text-gold-light' : 'text-zinc-200')}>
                    {activeLabel}
                  </span>
                </p>
                {lastActionText ? (
                  <motion.p
                    key={lastActionText}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="truncate text-sm font-medium text-ivory sm:text-base"
                  >
                    <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">
                      {t('table.lastAction')}:
                    </span>
                    {lastActionText}
                  </motion.p>
                ) : null}
              </div>
            )}
          </div>
          {secondsLeft !== null && showActions ? (
            <TurnTimer secondsLeft={secondsLeft} size={40} className="sm:hidden" />
          ) : null}
          {secondsLeft !== null && showActions ? (
            <TurnTimer secondsLeft={secondsLeft} size={48} className="hidden sm:flex" />
          ) : null}
        </div>

        {showActions && trumpChoice ? (
          <div className="flex flex-wrap gap-2">
            {TRUMP_SUITS.map((suit) => (
              <Button
                key={suit}
                variant="secondary"
                size="sm"
                className="border-gold/25 text-xs uppercase"
                onClick={() => handleTrump(suit)}
              >
                {suitLabel(suit, t)}
              </Button>
            ))}
            <Button variant="primary" size="sm" className="text-xs uppercase" onClick={() => handleTrump(null)}>
              {t('table.jokerTrumpNoTrump')}
            </Button>
          </div>
        ) : null}

        {showActions && bidding && dealerBidBlocked ? (
          <p className="mb-2 text-xs text-rose/90">{t('table.jokerDealerBidHint')}</p>
        ) : null}

        {showActions && bidding ? (
          <div className="table-action-segment flex flex-col gap-2 p-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <input
              type="range"
              min={0}
              max={maxBid}
              step={1}
              value={clampedBid}
              disabled={pendingBid}
              aria-label={t('table.bidSliderLabel')}
              aria-valuemin={0}
              aria-valuemax={maxBid}
              aria-valuenow={clampedBid}
              aria-valuetext={t('table.jokerBid', { amount: clampedBid })}
              onChange={(e) => onBidAmountChange(Number(e.target.value))}
              style={{
                ['--range-fill' as string]:
                  maxBid > 0 ? `${(clampedBid / maxBid) * 100}%` : '0%'
              }}
              className="premium-range w-full min-w-0 flex-1 disabled:opacity-50 sm:min-w-[8rem]"
            />
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.08] font-mono text-lg font-bold text-gold-light">
                {clampedBid}
              </span>
              <Button
                variant="primary"
                size="lg"
                className="min-h-11 flex-1 border border-gold/30 shadow-glow-gold sm:min-h-12 sm:flex-none"
                disabled={pendingBid || dealerBidBlocked}
                onClick={handleBid}
              >
                {pendingBid ? t('table.submittingBid') : t('table.jokerBid', { amount: clampedBid })}
              </Button>
            </div>
          </div>
        ) : null}

        {declarationCard ? (
          <div className="mb-2 rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-500/15 to-gold/[0.04] p-3 shadow-[0_0_24px_rgba(139,92,246,0.12)] ring-1 ring-gold/15">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-200">
              {t('table.jokerDeclarationTitle')}
            </p>
            <div className="flex flex-wrap gap-2">
              {nominalTrumpBlocked(declarationCard) ? (
                <p className="w-full text-[11px] text-amber-200/90">{t('table.errors.nominalTrumpBanned')}</p>
              ) : null}
              {(['nominal', 'senior', 'minor'] as const)
                .filter((mode) => mode !== 'nominal' || !nominalTrumpBlocked(declarationCard))
                .map((mode) => (
                  <Button
                    key={mode}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() => handlePlay(declarationCard, mode)}
                  >
                    {t(
                      mode === 'nominal'
                        ? 'table.jokerDeclNominal'
                        : mode === 'senior'
                          ? 'table.jokerDeclSenior'
                          : 'table.jokerDeclMinor'
                    )}
                  </Button>
                ))}
              {isLeadingTrick
                ? TRUMP_SUITS.flatMap((suit) => [
                    <Button
                      key={`lead-hi-${suit}`}
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        handlePlay(declarationCard, { suit, rankMode: 'senior' })
                      }
                    >
                      {t('table.jokerDeclLeadSuit', { suit: suitLabel(suit, t) })}
                    </Button>,
                    <Button
                      key={`lead-lo-${suit}`}
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        handlePlay(declarationCard, { suit, rankMode: 'minor' })
                      }
                    >
                      {t('table.jokerDeclLeadSuitLow', { suit: suitLabel(suit, t) })}
                    </Button>
                  ])
                : null}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setDeclarationCard(null)}>
                {t('table.fold')}
              </Button>
            </div>
          </div>
        ) : null}

        {showHand ? (
          <div className="flex flex-col gap-2">
            {!showActions && !lastActionText ? (
              <p className="text-center text-sm text-subtle">{t('table.waitingOpponent')}</p>
            ) : null}
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
              {holeCards.length === 0 ? (
                <p className="text-sm text-muted">{t('table.jokerNoCards')}</p>
              ) : (
                holeCards.map((c, i) => {
                  const playable = showActions && !bidding && !trumpChoice && legalCards.has(c);
                  const CardEl = (
                    <PlayingCard
                      card={c}
                      faceUp
                      deckId={deckId}
                      size="sm"
                      className={cn(
                        'shrink-0 snap-start shadow-lg transition duration-200 sm:scale-100',
                        playable && !pendingCard ? 'hover:-translate-y-1 hover:scale-105' : '',
                        playable && !pendingCard ? 'ring-2 ring-gold/60 shadow-[0_0_20px_rgba(232,197,71,0.25)] scale-[1.02]' : '',
                        !playable && showActions && !bidding && !trumpChoice ? 'opacity-40 grayscale' : ''
                      )}
                    />
                  );
                  if (showActions && !bidding && !trumpChoice) {
                    return (
                      <button
                        key={`${joker.trickNumber}-${i}-${c}`}
                        type="button"
                        disabled={!playable || pendingCard === c}
                        aria-label={t('table.playCardLabel', { card: formatCardLabel(c, t) })}
                        className={cn(
                          'rounded-lg focus:outline-none focus:ring-2 focus:ring-gold/50',
                          playable && !pendingCard ? 'cursor-pointer' : 'cursor-default'
                        )}
                        onClick={() => handleCardClick(c)}
                      >
                        {CardEl}
                      </button>
                    );
                  }
                  return (
                    <div key={`${joker.trickNumber}-${i}-${c}`} className="rounded-lg">
                      {CardEl}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>
    </motion.footer>
  );
}
