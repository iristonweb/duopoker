import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import type { GameFeedEvent } from '../../hooks/useTableGameFeed';

const kindStyle: Record<GameFeedEvent['kind'], string> = {
  action: 'border-white/10 text-zinc-200',
  street: 'border-emerald/25 text-emerald',
  hand: 'border-gold/25 text-gold-light',
  blinds: 'border-gold/20 text-muted',
  winner: 'border-gold/35 text-gradient-gold',
  system: 'border-white/10 text-subtle'
};

type Props = {
  events: GameFeedEvent[];
  className?: string;
  title?: string;
};

export function GameEventFeed({ events, className, title }: Props) {
  return (
    <aside
      className={cn(
        'absolute left-0 top-0 z-20 flex max-h-full w-full flex-col',
        className
      )}
    >
      {title ? (
        <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/60">{title}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
        <AnimatePresence initial={false}>
          {events.slice(0, 8).map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'rounded-lg border bg-black/55 px-2.5 py-1.5 text-[11px] leading-snug shadow-lg backdrop-blur-md sm:text-xs',
                kindStyle[ev.kind]
              )}
            >
              {ev.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </aside>
  );
}
