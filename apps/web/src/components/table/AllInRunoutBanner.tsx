import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';

type Props = {
  visible: boolean;
  className?: string;
};

export function AllInRunoutBanner({ visible, className }: Props) {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'pointer-events-none absolute left-1/2 top-[14%] z-[35] -translate-x-1/2',
        className
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/15 px-4 py-2 shadow-[0_0_32px_rgba(251,191,36,0.35)] backdrop-blur-md">
        <span className="text-sm text-amber-200" aria-hidden>
          ★
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-amber-100 sm:text-sm">
          {t('table.allInRunoutBanner')}
        </span>
      </div>
    </motion.div>
  );
}
