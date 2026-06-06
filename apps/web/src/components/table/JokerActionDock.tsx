import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';
import type { Card, JokerHandState } from '@duopoker/shared-types/index';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { TurnTimer } from './TurnTimer';

type Props = {
  myTurn: boolean;
  street: string;
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
  onBid,
  onPlayCard
}: Props) {
  const { t } = useTranslation();
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY';
  const bidding = street === 'BIDDING';

  return (
    <motion.footer
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'relative z-40 shrink-0 border-t bg-background/90 backdrop-blur-xl',
        showActions ? 'border-gold/30 shadow-[0_-8px_40px_rgba(232,197,71,0.14)]' : 'border-white/10'
      )}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-5 sm:py-4">
        {sessionError ? (
          <p className="mb-2 rounded-lg border border-rose/30 bg-rose/10 px-3 py-1.5 text-xs text-rose">
            {t('table.actionError', { code: sessionError, defaultValue: sessionError })}
          </p>
        ) : null}

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted sm:text-sm">
          <span>
            {t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1, defaultValue: `Pool ${joker.pool} · hand ${joker.matchHandIndex + 1}/24` })}
          </span>
          <span>
            {t('table.jokerTrump', {
              trump: joker.trumpSuit ?? t('table.jokerNoTrump'),
              defaultValue: joker.trumpSuit ? `Trump: ${joker.trumpSuit}` : 'No trump'
            })}
          </span>
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
              onChange={(e) => onBidAmountChange(Number(e.target.value))}
              className="h-2 min-w-[8rem] flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-gold"
            />
            <span className="w-8 font-mono text-lg font-bold text-gold-light">{bidAmount}</span>
            <Button variant="primary" size="lg" className="min-h-12" onClick={onBid}>
              {t('table.jokerBid', { amount: bidAmount })}
            </Button>
          </div>
        ) : null}

        {showActions && !bidding ? (
          <div className="flex flex-wrap gap-2">
            {holeCards.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                className="rounded-lg transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold/50"
                onClick={() => onPlayCard(c)}
              >
                <PlayingCard card={c} faceUp deckId={deckId} size="md" className="shadow-lg" />
              </button>
            ))}
          </div>
        ) : null}

        {!showActions && street !== 'COMPLETE' && street !== 'LOBBY' ? (
          <p className="text-center text-sm text-subtle">{t('table.waitingOpponent')}</p>
        ) : null}
      </div>
    </motion.footer>
  );
}
