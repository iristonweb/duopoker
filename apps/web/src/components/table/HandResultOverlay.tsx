import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';

type Props = {
  visible: boolean;
  winners: string;
  gameOver: boolean;
  nextHandSeconds: number | null;
  className?: string;
};

export function HandResultOverlay({ visible, winners, gameOver, nextHandSeconds, className }: Props) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center px-4 sm:top-[4.5rem]',
            className
          )}
        >
          <div className="max-w-lg rounded-2xl border border-gold/30 bg-black/70 px-5 py-3 text-center shadow-[0_8px_40px_rgba(232,197,71,0.2)] backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/70">
              {t('table.handResult')}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-gradient-gold">{t('table.handComplete')}</p>
            <p className="mt-1 text-sm text-muted">{t('table.winners', { names: winners || '—' })}</p>
            {gameOver ? (
              <p className="mt-2 text-xs text-subtle">
                {t('table.gameOver', { defaultValue: 'Game over — not enough players with chips.' })}
              </p>
            ) : nextHandSeconds !== null && nextHandSeconds > 0 ? (
              <p className="mt-2 text-xs text-subtle">
                {t('table.nextHandAuto', {
                  seconds: nextHandSeconds,
                  defaultValue: `Next hand in ${nextHandSeconds}s…`
                })}
              </p>
            ) : (
              <p className="mt-2 text-xs text-subtle">
                {t('table.dealingNext', { defaultValue: 'Dealing next hand…' })}
              </p>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
