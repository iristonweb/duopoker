import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import type { GameFeedEvent } from '../../hooks/useTableGameFeed';

const kindStyle: Record<GameFeedEvent['kind'], string> = {
  action: 'border-l-2 border-l-zinc-400/60 text-zinc-100',
  street: 'border-l-2 border-l-emerald/70 text-emerald',
  hand: 'border-l-2 border-l-gold/70 text-gold-light',
  blinds: 'border-l-2 border-l-gold/40 text-muted',
  winner: 'border-l-2 border-l-amber-400/80 text-amber-100',
  system: 'border-l-2 border-l-violet-400/50 text-violet-100'
};

const kindIcon: Record<GameFeedEvent['kind'], string> = {
  action: '◆',
  street: '▸',
  hand: '♠',
  blinds: '◎',
  winner: '★',
  system: '◇'
};

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
  soundOn: boolean;
  onSoundToggle: () => void;
  title: string;
  openLabel: string;
  closeLabel: string;
  emptyLabel: string;
  className?: string;
};

export function GameStoryPanel({
  events,
  pulseKey,
  soundOn,
  onSoundToggle,
  title,
  openLabel,
  closeLabel,
  emptyLabel,
  className
}: Props) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [open, events.length]);

  const latest = events[0];

  return (
    <div className={cn('flex w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-2', className)}>
      <AnimatePresence mode="wait">
        {latest && !open ? (
          <motion.div
            key={`${latest.id}-${pulseKey}`}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={cn(
              'rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 text-xs leading-relaxed shadow-lg backdrop-blur-md sm:text-sm',
              kindStyle[latest.kind]
            )}
          >
            <span className="mr-1.5 opacity-60">{kindIcon[latest.kind]}</span>
            {latest.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition',
            open
              ? 'border-gold/40 bg-gold/15 text-gold-light'
              : 'border-white/15 bg-black/55 text-muted backdrop-blur-sm hover:border-gold/30 hover:text-gold-light'
          )}
        >
          {open ? closeLabel : openLabel}
          {!open && events.length > 0 ? (
            <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] text-gold-light">
              {events.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={onSoundToggle}
          className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-subtle backdrop-blur-sm transition hover:text-muted"
          aria-label={soundOn ? 'Sound on' : 'Sound off'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-black/75 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/70">{title}</p>
              </div>
              <div
                ref={listRef}
                className="premium-scroll max-h-[min(42vh,20rem)] space-y-1 overflow-y-auto p-2"
              >
                {events.length === 0 ? (
                  <p className="px-2 py-4 text-center text-xs text-subtle">{emptyLabel}</p>
                ) : (
                  events.map((ev, i) => (
                    <motion.div
                      key={ev.id}
                      initial={i === 0 ? { opacity: 0, x: -8 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        'rounded-lg bg-white/[0.03] px-2.5 py-2 text-[11px] leading-snug sm:text-xs',
                        kindStyle[ev.kind]
                      )}
                    >
                      <span className="mr-1 opacity-50">{kindIcon[ev.kind]}</span>
                      {ev.text}
                      <span className="mt-0.5 block text-[9px] text-subtle/80">
                        {new Date(ev.at).toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
