import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';
import type { Card, GameStreet, JokerHandState } from '@duopoker/shared-types/index';
import { jokerLegalPlays, leadSuitFromTrick } from '@duopoker/shared-types/index';
import { formatCardLabel, jokerTrumpDisplay } from '../../lib/joker-labels';
import { formatTableError } from '../../lib/table-errors';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { JokerTrumpBadge } from './JokerTrumpBadge';
import { TurnTimer } from './TurnTimer';

const PENDING_CARD_TIMEOUT_MS = 3000;

type Props = {
  myTurn: boolean;
  street: GameStreet;
  holeCards: Card[];
  deckId: string;
  joker: JokerHandState;
  bidAmount: number;
  maxBid: number;
  onBidAmountChange: (n: number) => void;
  secondsLeft: number | null;
  activeLabel: string;
  isHeroActive: boolean;
  sessionError?: string | null;
  actionLogLen: number;
  onBid: () => void;
  onPlayCard: (card: Card) => void;
};

export function JokerActionDock({
  myTurn,
  street,
  holeCards,
  deckId,
  joker,
  bidAmount,
  maxBid,
  onBidAmountChange,
  secondsLeft,
  activeLabel,
  isHeroActive,
  sessionError,
  actionLogLen,
  onBid,
  onPlayCard
}: Props) {
  const { t } = useTranslation();
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY';
  const bidding = street === 'BIDDING';
  const showHand = street === 'BIDDING' || street === 'TRICKS';
  const trump = jokerTrumpDisplay(joker, t);

  const legalCards = useMemo(() => {
    if (bidding || !showActions) return new Set<string>();
    const lead = leadSuitFromTrick(joker.currentTrick);
    return new Set(jokerLegalPlays(holeCards, lead, joker.trumpSuit));
  }, [bidding, showActions, holeCards, joker.currentTrick, joker.trumpSuit]);

  const clearPendingTimer = () => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  };

  useEffect(() => {
    setPendingCard(null);
    clearPendingTimer();
  }, [holeCards.length, joker.trickNumber, sessionError, actionLogLen]);

  useEffect(() => () => clearPendingTimer(), []);

  const handlePlay = (card: Card) => {
    if (pendingCard || !legalCards.has(card)) return;
    setPendingCard(card);
    clearPendingTimer();
    pendingTimerRef.current = setTimeout(() => setPendingCard(null), PENDING_CARD_TIMEOUT_MS);
    onPlayCard(card);
  };

  return (
    <motion.footer
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'glass-shine relative z-40 shrink-0 border-t bg-background/90 backdrop-blur-xl',
        showActions ? 'border-gold/30 shadow-glow-gold' : 'border-white/10'
      )}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-5 sm:py-4">
        {sessionError ? (
          <p className="mb-2 rounded-lg border border-rose/30 bg-rose/10 px-3 py-1.5 text-xs text-rose">
            {formatTableError(sessionError, t)}
          </p>
        ) : null}

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted sm:text-sm">
          <span>
            {t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })}
          </span>
          <span className="hidden sm:inline">{trump.line}</span>
          {joker.currentTrick.length > 0 ? (
            <span className="text-gold-light/90">
              {t('table.jokerTrick', { n: joker.trickNumber + 1 })}
            </span>
          ) : null}
        </div>
        <div className="mb-2 flex justify-center md:hidden">
          <JokerTrumpBadge joker={joker} showHint={bidding && trump.noTrump} size="sm" />
        </div>

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            {showActions ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/85 sm:text-sm">
                {bidding ? t('table.jokerBidPrompt') : t('table.jokerPlayPrompt')}
              </p>
            ) : (
              <p className="truncate text-sm text-muted">
                {t('table.toAct')}{' '}
                <span className={cn('font-medium', isHeroActive ? 'text-gold-light' : 'text-zinc-200')}>
                  {activeLabel}
                </span>
              </p>
            )}
          </div>
          {secondsLeft !== null && showActions ? (
            <TurnTimer secondsLeft={secondsLeft} size={48} />
          ) : null}
        </div>

        {showActions && bidding ? (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="range"
              min={0}
              max={maxBid}
              step={1}
              value={bidAmount}
              aria-label={t('table.bidSliderLabel')}
              aria-valuemin={0}
              aria-valuemax={maxBid}
              aria-valuenow={bidAmount}
              aria-valuetext={t('table.jokerBid', { amount: bidAmount })}
              onChange={(e) => onBidAmountChange(Number(e.target.value))}
              className="h-2 min-w-[8rem] flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-gold"
            />
            <span className="w-8 font-mono text-lg font-bold text-gold-light">{bidAmount}</span>
            <Button variant="primary" size="lg" className="min-h-12" onClick={onBid}>
              {t('table.jokerBid', { amount: bidAmount })}
            </Button>
          </div>
        ) : null}

        {showHand ? (
          <div className="flex flex-col gap-2">
            {!showActions && street !== 'COMPLETE' && street !== 'LOBBY' ? (
              <p className="text-center text-sm text-subtle">{t('table.waitingOpponent')}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {holeCards.length === 0 ? (
                <p className="text-sm text-muted">{t('table.jokerNoCards')}</p>
              ) : (
                holeCards.map((c, i) => {
                  const playable = showActions && !bidding && legalCards.has(c);
                  const CardEl = (
                    <PlayingCard
                      card={c}
                      faceUp
                      deckId={deckId}
                      size="md"
                      className={cn(
                        'shadow-lg transition',
                        playable && !pendingCard ? 'hover:scale-105' : '',
                        !playable && showActions && !bidding ? 'opacity-40 grayscale' : ''
                      )}
                    />
                  );
                  if (showActions && !bidding) {
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
                        onClick={() => handlePlay(c)}
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
