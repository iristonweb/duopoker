import { motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import { PokerChipStack, PokerChipVisual } from '../cosmetics/PokerChipVisual';

type Props = {
  pot: number;
  chipId: string;
  street?: string;
  className?: string;
};

export function AnimatedPotDisplay({ pot, chipId, street, className }: Props) {
  const chipCount = Math.min(6, Math.max(2, 2 + Math.floor(Math.log10(Math.max(10, pot)) * 1.2)));

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center gap-2.5 rounded-full border border-gold/30 bg-black/60 px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(232,197,71,0.15)] backdrop-blur-md',
        className
      )}
    >
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}>
        <PokerChipStack chipId={chipId} count={chipCount} />
      </motion.div>
      <PokerChipVisual chipId={chipId} size="sm" />
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/70">Pot</span>
        <motion.span
          key={pot}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          className="font-mono text-sm font-bold text-gold-light"
        >
          {pot.toLocaleString()}
        </motion.span>
      </div>
      {street ? (
        <span className="ml-1 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald sm:hidden">
          {street}
        </span>
      ) : null}
    </motion.div>
  );
}
