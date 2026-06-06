import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Button, cn } from '@duopoker/ui-kit';

type Props = {
  visible: boolean;
  onWatch: () => void;
  onLeave: () => void;
  leaving?: boolean;
  className?: string;
};

export function BustedPlayerOverlay({ visible, onWatch, onLeave, leaving, className }: Props) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn('absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm', className)}
        >
          <div className="max-w-md rounded-2xl border border-rose/30 bg-background/95 p-6 text-center shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose/80">
              {t('table.bustedEyebrow')}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-ivory">{t('table.bustedTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t('table.bustedDesc')}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="md" onClick={onWatch}>
                {t('table.watchTable')}
              </Button>
              <Button variant="ghost" size="md" className="border-rose/30 text-rose-300" disabled={leaving} onClick={onLeave}>
                {leaving ? t('table.leaving') : t('table.leaveTable')}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
