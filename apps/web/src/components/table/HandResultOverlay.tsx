import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, GlassPanel, cn } from '@duopoker/ui-kit';

type Props = {
  visible: boolean;
  winners?: string;
  /** When set, replaces the winners line (e.g. Joker hand points). */
  summaryText?: string;
  summaryHeading?: string;
  gameOver: boolean;
  gameOverMessage?: string;
  nextHandSeconds: number | null;
  canPeekGhostBoard?: boolean;
  ghostBoardVisible?: boolean;
  onToggleGhostBoard?: () => void;
  showGhostUpsell?: boolean;
  className?: string;
};

export function HandResultOverlay({
  visible,
  winners,
  summaryText,
  summaryHeading,
  gameOver,
  gameOverMessage,
  nextHandSeconds,
  canPeekGhostBoard = false,
  ghostBoardVisible = false,
  onToggleGhostBoard,
  showGhostUpsell = false,
  className
}: Props) {
  const { t } = useTranslation();
  const resultLine =
    summaryText !== undefined
      ? summaryText
      : t('table.winners', { names: winners || '—' });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-[4.5rem]',
            className
          )}
        >
          <GlassPanel glow="gold" className="max-w-lg px-5 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/70">
              {summaryHeading ?? t('table.handResult')}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-gradient-gold">{t('table.handComplete')}</p>
            <p className="mt-1 text-sm text-muted">{resultLine}</p>
            {canPeekGhostBoard && onToggleGhostBoard ? (
              <div className="pointer-events-auto mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-gold/25 text-xs uppercase tracking-wider"
                  onClick={onToggleGhostBoard}
                >
                  {ghostBoardVisible ? t('table.hideGhostBoard') : t('table.peekGhostBoard')}
                </Button>
                {ghostBoardVisible ? (
                  <p className="mt-2 text-[11px] text-subtle">{t('table.ghostBoardHint')}</p>
                ) : null}
              </div>
            ) : null}
            {showGhostUpsell ? (
              <div className="pointer-events-auto mt-3 space-y-2">
                <p className="text-[11px] text-subtle">{t('table.ghostBoardUpsell')}</p>
                <Link
                  to="/lobby#subscriptions"
                  className="inline-flex text-xs font-semibold uppercase tracking-wider text-gold hover:text-gold-light"
                >
                  {t('table.ghostBoardSubscribe')}
                </Link>
              </div>
            ) : null}
            {gameOver ? (
              <p className="mt-2 text-xs text-subtle">
                {gameOverMessage ?? t('table.gameOver')}
              </p>
            ) : nextHandSeconds !== null && nextHandSeconds > 0 ? (
              <p className="mt-2 text-xs text-subtle">
                {t('table.nextHandAuto', { seconds: nextHandSeconds })}
              </p>
            ) : (
              <p className="mt-2 text-xs text-subtle">{t('table.dealingNext')}</p>
            )}
          </GlassPanel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
