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
  minTotal: number;
  maxTotal: number;
  canRaise: boolean;
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
  lastActionText?: string;
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
  minTotal,
  maxTotal,
  canRaise,
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
  lastActionText,
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
  const clampedRaise = Math.min(maxTotal, Math.max(minTotal, raiseAmount || minTotal));

  return (
    <motion.footer
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'glass-shine relative z-40 shrink-0 border-t bg-background/92 backdrop-blur-xl',
        showActions
          ? 'border-gradient-gold border-gold/35 shadow-glow-gold'
          : 'border-white/10'
      )}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      {showActions ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      ) : null}
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
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold/85 sm:text-sm">
                  {t('table.yourAction', { amount: need })}
                  {secondsLeft !== null ? (
                    <span className="ml-1.5 font-mono normal-case tracking-normal text-subtle">
                      · {t('table.timeLeft', { seconds: secondsLeft, defaultValue: `${secondsLeft}s` })}
                    </span>
                  ) : null}
                </p>
              ) : street === 'COMPLETE' ? null : (
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
                      <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-gold/60">
                        {t('table.lastAction')}:
                      </span>
                      {lastActionText}
                    </motion.p>
                  ) : null}
                </div>
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

            <Button
              variant="ghost"
              size="lg"
              className="min-h-12 min-w-[4.5rem] border-rose/25 text-rose hover:border-rose/40 hover:bg-rose/10"
              onClick={onFold}
            >
              {t('table.fold')}
            </Button>

            <div className="relative">
              {secondsLeft !== null ? (
                <TurnTimer secondsLeft={secondsLeft} size={48} className="absolute -left-1 -top-1 sm:hidden" />
              ) : null}
              {need === 0 ? (
                <Button
                  variant="secondary"
                  size="lg"
                  className="min-h-12 min-w-[5.5rem] border-emerald/30 shadow-[0_0_16px_rgba(74,222,128,0.12)]"
                  onClick={onCheck}
                >
                  {t('table.check')}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  className="min-h-12 min-w-[5.5rem] border-emerald/30 shadow-[0_0_16px_rgba(74,222,128,0.12)]"
                  onClick={onCall}
                >
                  {t('table.call', { amount: need })}
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="lg"
              className="min-h-12 border-gold/25 text-gold-light hover:border-gold/40 hover:bg-gold/10"
              disabled={!canRaise}
              onClick={() => onRaiseAmountChange(halfPotRaise)}
            >
              {t('table.halfPot')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="min-h-12 border-gold/25 text-gold-light hover:border-gold/40 hover:bg-gold/10"
              disabled={!canRaise}
              onClick={() => onRaiseAmountChange(potRaise)}
            >
              {t('table.potBet')}
            </Button>

            {canRaise ? (
              <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto sm:flex-[1_1_12rem]">
                <input
                  type="range"
                  min={minTotal}
                  max={maxTotal}
                  step={1}
                  value={clampedRaise}
                  onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
                  className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-gold [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold"
                  aria-label={t('table.raise')}
                />
                <span className="w-14 shrink-0 text-center font-mono text-sm font-bold text-gold-light">
                  {clampedRaise.toLocaleString()}
                </span>
                <Button
                  variant="primary"
                  size="lg"
                  className="min-h-12 shrink-0 border border-gold/30 shadow-glow-gold"
                  onClick={onRaise}
                >
                  {currentBet > 0 ? t('table.raise') : t('table.bet')}
                </Button>
              </div>
            ) : null}
          </div>
        ) : street !== 'COMPLETE' && street !== 'LOBBY' ? (
          <p className="text-center text-sm text-subtle">
            {heroSpectating ? t('table.spectating') : lastActionText ? null : t('table.waitingOpponent')}
          </p>
        ) : null}
      </div>
    </motion.footer>
  );
}
