import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';
import { PokerChipStack } from '../cosmetics/PokerChipVisual';

type Props = {
  pot: number;
  chipId: string;
  street?: string;
  pulseKey?: number;
  sidePots?: number[];
  className?: string;
};

export function AnimatedPotDisplay({ pot, chipId, pulseKey = 0, sidePots = [], className }: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const chipCount = Math.min(6, Math.max(2, 2 + Math.floor(Math.log10(Math.max(10, pot)) * 1.2)));

  return (
    <motion.div
      layout
      key={pulseKey}
      animate={
        !reduceMotion && pulseKey > 0
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
      transition={{ duration: reduceMotion ? 0.01 : 0.65 }}
      className={cn(
        'flex items-center gap-2 rounded-full border border-gold/40 bg-black/70 px-3 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.55),0_0_40px_rgba(232,197,71,0.25)] backdrop-blur-md ring-1 ring-gold/15',
        'table-compact:gap-1.5 table-compact:px-2.5 table-compact:py-1',
        'table-short:gap-1.5 table-short:px-2.5 table-short:py-1',
        'max-table-compact:gap-3 max-table-compact:px-5 max-table-compact:py-2.5',
        className
      )}
    >
      <motion.div
        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      >
        <PokerChipStack
          chipId={chipId}
          count={chipCount}
          className="table-compact:scale-90 table-short:scale-90"
        />
      </motion.div>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-gold/90 max-table-compact:text-[10px]">
          {t('table.potLabel')}
        </span>
        <motion.span
          key={pot}
          initial={{ scale: 1.25, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="text-gradient-gold font-mono text-base font-bold max-table-compact:text-xl"
        >
          {pot.toLocaleString()}
        </motion.span>
      </div>
      {sidePots.length > 1 ? (
        <div
          className={cn(
            'ml-1 flex flex-wrap gap-x-2 gap-y-0 border-l border-white/10 pl-2',
            'table-compact:flex-row table-short:flex-row',
            'max-table-compact:ml-2 max-table-compact:flex-col max-table-compact:gap-0.5'
          )}
        >
          {sidePots.map((amount, i) => (
            <span key={i} className="font-mono text-[9px] text-subtle">
              {t('table.sidePotShort', { index: i + 1, amount })}
            </span>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
