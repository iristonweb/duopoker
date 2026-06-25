import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';
import type { Card, GameStreet } from '@duopoker/shared-types/index';
import { formatTableError } from '@duopoker/table-client';
import { tableHaptic } from '../../../../lib/table-haptics';

type Props = {
  myTurn: boolean;
  need: number;
  minTotal: number;
  maxTotal: number;
  canRaise: boolean;
  raiseAmount: number;
  onRaiseAmountChange: (n: number) => void;
  kettle: number;
  secondsLeft: number | null;
  holeCards: Card[];
  deckId: string;
  activeLabel: string;
  street: GameStreet;
  heroSpectating?: boolean;
  sessionError?: string | null;
  stack: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  onChatOpen: () => void;
  onMenuOpen: () => void;
  chatUnread: number;
  chatLabel: string;
  menuLabel: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  dockRef?: (node: HTMLElement | null) => void;
};

export function MobileActionDock({
  myTurn,
  need,
  minTotal,
  maxTotal,
  canRaise,
  raiseAmount,
  onRaiseAmountChange,
  street,
  heroSpectating,
  sessionError,
  stack,
  onFold,
  onCheck,
  onCall,
  onRaise,
  onChatOpen,
  onMenuOpen,
  chatUnread,
  chatLabel,
  menuLabel,
  t,
  dockRef
}: Props) {
  const [raiseOpen, setRaiseOpen] = useState(false);
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY' && !heroSpectating;
  const clampedRaise = Math.min(maxTotal, Math.max(minTotal, raiseAmount || minTotal));

  return (
    <>
      <AnimatePresence>
        {raiseOpen && showActions ? (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="fixed inset-x-0 bottom-[var(--mobile-table-dock-height)] z-[45] rounded-t-2xl border border-gold/25 bg-surface px-4 py-4 shadow-panel"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
              {t('table.raise')}
            </p>
            <input
              type="range"
              min={minTotal}
              max={maxTotal}
              value={clampedRaise}
              onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
              className="w-full accent-gold"
            />
            <p className="mt-1 text-center font-mono text-sm text-gold-light">{clampedRaise}</p>
            <Button
              variant="primary"
              className="mt-3 min-h-[48px] w-full"
              onClick={() => {
                onRaise();
                setRaiseOpen(false);
              }}
            >
              {t('table.raiseTo', { amount: clampedRaise })}
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <footer
        ref={dockRef}
        data-testid="mobile-action-dock"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/25 bg-background/95"
        style={{
          minHeight: '5rem',
          maxHeight: '6.875rem',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {sessionError ? (
          <p className="px-3 py-1 text-xs text-rose">{formatTableError(sessionError, t)}</p>
        ) : null}

        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">{t('table.stack')}</p>
            <p className="font-mono text-lg font-bold text-gold-light">{stack}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onChatOpen}
              className="relative flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg"
              aria-label={chatLabel}
            >
              💬
              {chatUnread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                  {chatUnread > 9 ? '9+' : chatUnread}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={onMenuOpen}
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg"
              aria-label={menuLabel}
            >
              ☰
            </button>
          </div>
        </div>

        {showActions ? (
          <div className="grid grid-cols-3 gap-2 px-3 pb-2">
            <Button
              variant="secondary"
              className="min-h-[56px] text-sm"
              onClick={() => {
                tableHaptic('fold');
                onFold();
              }}
            >
              {t('table.fold')}
            </Button>
            <Button
              variant="secondary"
              className="min-h-[56px] text-sm"
              onClick={() => {
                tableHaptic('check');
                if (need === 0) onCheck();
                else onCall();
              }}
            >
              {need === 0 ? t('table.check') : t('table.call', { amount: need })}
            </Button>
            <Button
              variant="primary"
              className={cn('min-h-[56px] text-sm', !canRaise && 'opacity-50')}
              disabled={!canRaise}
              onClick={() => {
                tableHaptic('raise');
                setRaiseOpen((v) => !v);
              }}
            >
              {t('table.raise')}
            </Button>
          </div>
        ) : (
          <p className="px-3 pb-2 text-center text-xs text-muted">
            {heroSpectating ? t('table.spectating') : t('table.toAct')}
          </p>
        )}
      </footer>
    </>
  );
}
