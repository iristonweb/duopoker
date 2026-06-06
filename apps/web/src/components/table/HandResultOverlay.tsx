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
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-[4.5rem]',
            className
          )}
        >
          <GlassPanel
            glow="gold"
            className="relative max-w-lg overflow-hidden px-6 py-4 text-center shadow-[0_0_48px_rgba(232,197,71,0.2)]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-gold/60"
                  initial={{
                    x: `${20 + i * 15}%`,
                    y: '50%',
                    opacity: 0.8,
                    scale: 1
                  }}
                  animate={{
                    y: ['50%', `${20 + i * 8}%`, '80%'],
                    opacity: [0.8, 0.4, 0],
                    scale: [1, 0.5, 0]
                  }}
                  transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity, repeatDelay: 2 }}
                />
              ))}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
              {summaryHeading ?? t('table.handResult')}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-gradient-gold">{t('table.handComplete')}</p>
            <p className="mt-2 text-sm text-muted">{resultLine}</p>
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
