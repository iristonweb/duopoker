import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';
import { PokerChipStack, PokerChipVisual } from '../cosmetics/PokerChipVisual';

type Props = {
  pot: number;
  chipId: string;
  street?: string;
  pulseKey?: number;
  className?: string;
};

export function AnimatedPotDisplay({ pot, chipId, street, pulseKey = 0, className }: Props) {
  const { t } = useTranslation();
  const chipCount = Math.min(6, Math.max(2, 2 + Math.floor(Math.log10(Math.max(10, pot)) * 1.2)));

  return (
    <motion.div
      layout
      key={pulseKey}
      animate={
        pulseKey > 0
          ? {
              scale: [1, 1.06, 1],
              boxShadow: [
                '0 8px 32px rgba(0,0,0,0.5)',
                '0 0 48px rgba(232,197,71,0.55)',
                '0 8px 32px rgba(0,0,0,0.5)'
              ]
            }
          : undefined
      }
      transition={{ duration: 0.65 }}
      className={cn(
        'flex items-center gap-3 rounded-full border border-gold/35 bg-black/65 px-5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_32px_rgba(232,197,71,0.2)] backdrop-blur-md',
        className
      )}
    >
      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}>
        <PokerChipStack chipId={chipId} count={chipCount} />
      </motion.div>
      <PokerChipVisual chipId={chipId} size="sm" />
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-gold/75">
          {t('table.potLabel')}
        </span>
        <motion.span
          key={pot}
          initial={{ scale: 1.25, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="text-gradient-gold font-mono text-base font-bold sm:text-lg"
        >
          {pot.toLocaleString()}
        </motion.span>
      </div>
      {street ? (
        <span className="ml-1 rounded-full border border-emerald/35 bg-emerald/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald sm:hidden">
          {street}
        </span>
      ) : null}
    </motion.div>
  );
}
