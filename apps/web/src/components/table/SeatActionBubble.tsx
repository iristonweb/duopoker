import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';

type Props = {
  text: string;
  className?: string;
};

export function SeatActionBubble({ text, className }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        key={text}
        initial={{ opacity: 0, y: 6, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.9 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'pointer-events-none absolute -top-9 left-1/2 z-[3] max-w-[9rem] -translate-x-1/2',
          'rounded-xl border border-gold/30 bg-black/75 px-2.5 py-1 text-center',
          'text-[9px] font-semibold uppercase tracking-[0.14em] text-gold-light shadow-glow-gold backdrop-blur-md sm:text-[10px]',
          className
        )}
      >
        {text}
      </motion.div>
    </AnimatePresence>
  );
}
