import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';
import type { Card, GameStreet } from '@duopoker/shared-types/index';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { TurnTimer } from './TurnTimer';
import { formatTableError } from '../../lib/table-errors';

type Props = {
  myTurn: boolean;
  need: number;
  currentBet: number;
  minRaise: number;
  maxRaise: number;
  raiseAmount: number;
  onRaiseAmountChange: (amount: number) => void;
  halfPotRaise: number;
  potRaise: number;
  kettle: number;
  secondsLeft: number | null;
  holeCards: Card[];
  deckId: string;
  activeLabel: string;
  isHeroActive: boolean;
  street: GameStreet;
  heroSpectating?: boolean;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  sessionError?: string | null;
};

export function TableActionDock({
  myTurn,
  need,
  currentBet,
  minRaise,
  maxRaise,
  raiseAmount,
  onRaiseAmountChange,
  halfPotRaise,
  potRaise,
  kettle,
  secondsLeft,
  holeCards,
  deckId,
  activeLabel,
  isHeroActive,
  street,
  heroSpectating,
  onFold,
  onCheck,
  onCall,
  onRaise,
  sessionError
}: Props) {
  const { t } = useTranslation();
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY';
  const clampedRaise = Math.min(maxRaise, Math.max(minRaise, raiseAmount || minRaise));

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
            {formatTableError(sessionError, t)}
          </p>
        ) : null}

        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {showActions && holeCards.length ? (
              <div className="flex shrink-0 gap-0.5">
                <AnimatePresence mode="popLayout">
                  {holeCards.map((c, i) => (
                    <motion.div
                      key={c}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                      className={cn(i === 0 && '-rotate-6', i === 1 && 'rotate-6')}
                    >
                      <PlayingCard
                        card={c}
                        faceUp
                        deckId={deckId}
                        size="sm"
                        className="scale-90 shadow-lg sm:scale-100"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : null}
            <div className="min-w-0">
              {showActions ? (
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold/85 sm:text-sm">
                  {t('table.yourAction', { amount: need })}
                  {secondsLeft !== null ? (
                    <span className="ml-1.5 font-mono normal-case tracking-normal text-subtle">
                      · {t('table.timeLeft', { seconds: secondsLeft, defaultValue: `${secondsLeft}s` })}
                    </span>
                  ) : null}
                </p>
              ) : street === 'COMPLETE' ? null : (
                <p className="truncate text-sm text-muted">
                  {t('table.toAct')}{' '}
                  <span className={cn('font-medium', isHeroActive ? 'text-gold-light' : 'text-zinc-200')}>
                    {activeLabel}
                  </span>
                </p>
              )}
            </div>
          </div>

          {showActions ? (
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="font-mono text-muted">
                {t('table.pot')}: <span className="font-semibold text-gold-light">{kettle.toLocaleString()}</span>
              </span>
              {need > 0 ? (
                <span className="font-mono text-muted">
                  {t('table.call', { amount: need })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {showActions ? (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {secondsLeft !== null ? <TurnTimer secondsLeft={secondsLeft} className="hidden sm:flex" /> : null}

            <Button variant="ghost" size="lg" className="min-h-12 min-w-[4.5rem]" onClick={onFold}>
              {t('table.fold')}
            </Button>

            <div className="relative">
              {secondsLeft !== null ? (
                <TurnTimer secondsLeft={secondsLeft} size={48} className="absolute -left-1 -top-1 sm:hidden" />
              ) : null}
              {need === 0 ? (
                <Button variant="secondary" size="lg" className="min-h-12 min-w-[5.5rem]" onClick={onCheck}>
                  {t('table.check')}
                </Button>
              ) : (
                <Button variant="secondary" size="lg" className="min-h-12 min-w-[5.5rem]" onClick={onCall}>
                  {t('table.call', { amount: need })}
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="lg"
              className="min-h-12 border-gold/20 text-gold-light"
              onClick={() => onRaiseAmountChange(halfPotRaise)}
            >
              {t('table.halfPot')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="min-h-12 border-gold/20 text-gold-light"
              onClick={() => onRaiseAmountChange(potRaise)}
            >
              {t('table.potBet')}
            </Button>

            <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-[1_1_12rem]">
              <input
                type="range"
                min={minRaise}
                max={maxRaise}
                step={1}
                value={clampedRaise}
                onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
                className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-gold"
                aria-label={t('table.raise')}
              />
              <span className="w-14 shrink-0 text-center font-mono text-sm font-bold text-gold-light">
                {clampedRaise.toLocaleString()}
              </span>
              <Button variant="primary" size="lg" className="min-h-12 shrink-0" onClick={onRaise}>
                {currentBet > 0 ? t('table.raise') : t('table.bet')}
              </Button>
            </div>
          </div>
        ) : street !== 'COMPLETE' && street !== 'LOBBY' ? (
          <p className="text-center text-sm text-subtle">
            {heroSpectating ? t('table.spectating') : t('table.waitingOpponent')}
          </p>
        ) : null}
      </div>
    </motion.footer>
  );
}
