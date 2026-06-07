import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import type { SeatActionKind } from '../../lib/seat-action-format';
import { seatActionIcon, seatActionStyles } from '../../lib/seat-action-format';

type Props = {
  text: string;
  kind?: SeatActionKind;
  className?: string;
};

export function SeatActionBubble({ text, kind = 'check', className }: Props) {
  const icon = seatActionIcon[kind];
  const style = seatActionStyles[kind];

  return (
    <AnimatePresence>
      <motion.div
        key={`${kind}-${text}`}
        initial={{ opacity: 0, y: 10, scale: 0.75 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: [0.75, 1.08, 1],
          transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
        }}
        exit={{ opacity: 0, y: -10, scale: 0.85 }}
        className={cn(
          'pointer-events-none absolute z-[25] min-w-[3.5rem] max-w-[10rem]',
          'flex items-center justify-center gap-1 rounded-lg border px-2 py-1 backdrop-blur-md',
          'text-[10px] font-bold uppercase tracking-[0.06em] whitespace-nowrap sm:min-w-[4.5rem] sm:max-w-[14rem] sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm',
          '-top-12 left-1/2 -translate-x-1/2',
          style,
          className
        )}
      >
        <span className="shrink-0 text-[10px] opacity-80 sm:text-xs" aria-hidden>
          {icon}
        </span>
        <span>{text}</span>
      </motion.div>
    </AnimatePresence>
  );
}
