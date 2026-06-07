import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';
import type { Card, GameStreet } from '@duopoker/shared-types/index';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { TurnTimer } from './TurnTimer';
import { formatTableError } from '../../lib/table-errors';
import { tableHaptic } from '../../lib/table-haptics';

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
  const [moreOpen, setMoreOpen] = useState(false);
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY';
  const clampedRaise = Math.min(maxTotal, Math.max(minTotal, raiseAmount || minTotal));

  return (
    <motion.footer
      data-testid="table-action-dock"
      initial={false}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'glass-shine relative z-40 shrink-0 border-t bg-background/92 backdrop-blur-xl',
        showActions
          ? 'border-gradient-gold border-gold/35 shadow-glow-gold table-action-segment-active'
          : 'border-white/10'
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
            <div className="hidden items-center gap-3 text-xs sm:flex sm:text-sm">
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
          <div className="flex flex-col gap-2 sm:gap-3">
            <div
              className={cn(
                'table-action-segment w-full max-sm:grid max-sm:grid-cols-3 sm:w-auto sm:inline-flex',
                showActions && 'table-action-segment-active'
              )}
            >
              <Button
                variant="ghost"
                size="lg"
                className="min-h-11 min-w-0 rounded-xl border-0 border-r border-rose/20 bg-rose/[0.08] text-rose shadow-[0_0_12px_rgba(244,63,94,0.1)] hover:bg-rose/15 max-sm:px-2 max-sm:text-xs sm:min-h-12 sm:min-w-[4.75rem]"
                onClick={() => {
                  tableHaptic('light');
                  onFold();
                }}
              >
                {t('table.fold')}
              </Button>

              <div className="relative max-sm:min-w-0">
                {secondsLeft !== null ? (
                  <TurnTimer secondsLeft={secondsLeft} size={40} className="absolute -left-1 -top-1 sm:hidden" />
                ) : null}
                {need === 0 ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="min-h-11 w-full min-w-0 rounded-none border-0 border-r border-emerald/20 bg-emerald/[0.1] shadow-[0_0_14px_rgba(74,222,128,0.12)] max-sm:px-2 max-sm:text-xs sm:min-h-12 sm:min-w-[5.5rem]"
                    onClick={() => {
                      tableHaptic('medium');
                      onCheck();
                    }}
                  >
                    {t('table.check')}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    className="min-h-11 w-full min-w-0 rounded-none border-0 border-r border-emerald/20 bg-emerald/[0.1] px-2 shadow-[0_0_14px_rgba(74,222,128,0.12)] max-sm:text-xs sm:min-h-12 sm:min-w-[5.5rem] sm:px-4"
                    onClick={() => {
                      tableHaptic('medium');
                      onCall();
                    }}
                  >
                    <span className="truncate">{t('table.call', { amount: need })}</span>
                  </Button>
                )}
              </div>

              {canRaise ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="min-h-11 min-w-0 rounded-xl border-0 shadow-glow-gold max-sm:px-2 max-sm:text-xs sm:hidden"
                  onClick={() => {
                    tableHaptic('heavy');
                    onRaise();
                  }}
                >
                  {currentBet > 0 ? t('table.raise') : t('table.bet')}
                </Button>
              ) : (
                <div className="hidden min-h-12 min-w-[5.5rem] sm:block" aria-hidden />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
              {secondsLeft !== null ? <TurnTimer secondsLeft={secondsLeft} className="hidden sm:flex" /> : null}

            <Button
              variant="ghost"
              size="lg"
              className="hidden min-h-12 border-gold/25 text-gold-light hover:border-gold/40 hover:bg-gold/10 sm:inline-flex"
              disabled={!canRaise}
              onClick={() => {
                tableHaptic('light');
                onRaiseAmountChange(halfPotRaise);
              }}
            >
              {t('table.halfPot')}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="hidden min-h-12 border-gold/25 text-gold-light hover:border-gold/40 hover:bg-gold/10 sm:inline-flex"
              disabled={!canRaise}
              onClick={() => {
                tableHaptic('light');
                onRaiseAmountChange(potRaise);
              }}
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
                  style={{
                    ['--range-fill' as string]:
                      maxTotal > minTotal
                        ? `${((clampedRaise - minTotal) / (maxTotal - minTotal)) * 100}%`
                        : '0%'
                  }}
                  className="premium-range"
                  aria-label={t('table.raise')}
                />
                <span className="w-14 shrink-0 text-center font-mono text-sm font-bold text-gold-light">
                  {clampedRaise.toLocaleString()}
                </span>
                <Button
                  variant="primary"
                  size="lg"
                  className="hidden min-h-12 shrink-0 border border-gold/30 shadow-glow-gold sm:inline-flex"
                  onClick={() => {
                    tableHaptic('heavy');
                    onRaise();
                  }}
                >
                  {currentBet > 0 ? t('table.raise') : t('table.bet')}
                </Button>
              </div>
            ) : null}

            {canRaise ? (
              <div className="w-full sm:hidden">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle transition hover:border-gold/30 hover:text-gold-light"
                >
                  {t('table.moreActions')}
                </button>
                {moreOpen ? (
                  <div className="mt-1.5 flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="min-h-10 flex-1 border-gold/25 text-xs text-gold-light"
                      onClick={() => {
                        tableHaptic('light');
                        onRaiseAmountChange(halfPotRaise);
                      }}
                    >
                      {t('table.halfPot')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="min-h-10 flex-1 border-gold/25 text-xs text-gold-light"
                      onClick={() => {
                        tableHaptic('light');
                        onRaiseAmountChange(potRaise);
                      }}
                    >
                      {t('table.potBet')}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            </div>
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
