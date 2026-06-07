import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GlassPanel, cn } from '@duopoker/ui-kit';
import type { GameFeedEvent } from '../../hooks/useTableGameFeed';
import { tableFabBottomClass } from '../../hooks/useTableDockHeight';

function FeedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M4 5h12M4 10h8M4 15h10" strokeLinecap="round" />
    </svg>
  );
}

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
  musicOn: boolean;
  onSoundToggle: () => void;
  onMusicToggle: () => void;
  soundOnLabel: string;
  soundOffLabel: string;
  musicOnLabel: string;
  musicOffLabel: string;
  title: string;
  openLabel: string;
  closeLabel: string;
  emptyLabel: string;
  className?: string;
};

function FeedList({
  events,
  emptyLabel,
  listRef
}: {
  events: GameFeedEvent[];
  emptyLabel: string;
  listRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={listRef} className="premium-scroll max-h-[min(42vh,20rem)] space-y-1 overflow-y-auto p-2 sm:max-h-[min(50dvh,20rem)]">
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
  );
}

function ControlButtons({
  soundOn,
  musicOn,
  onSoundToggle,
  onMusicToggle,
  soundOnLabel,
  soundOffLabel,
  musicOnLabel,
  musicOffLabel,
  compact
}: Pick<
  Props,
  | 'soundOn'
  | 'musicOn'
  | 'onSoundToggle'
  | 'onMusicToggle'
  | 'soundOnLabel'
  | 'soundOffLabel'
  | 'musicOnLabel'
  | 'musicOffLabel'
> & { compact?: boolean }) {
  const btnClass = compact
    ? 'rounded-full border px-2 py-1.5 text-[10px] backdrop-blur-sm transition'
    : 'rounded-full border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm transition';

  return (
    <>
      <button
        type="button"
        onClick={onSoundToggle}
        className={cn(
          btnClass,
          soundOn
            ? 'border-gold/30 bg-gold/10 text-gold-light'
            : 'border-white/10 bg-black/45 text-subtle hover:text-muted'
        )}
        aria-label={soundOn ? soundOnLabel : soundOffLabel}
        title={soundOn ? soundOnLabel : soundOffLabel}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>
      <button
        type="button"
        onClick={onMusicToggle}
        className={cn(
          btnClass,
          musicOn
            ? 'border-violet-400/35 bg-violet-500/15 text-violet-200'
            : 'border-white/10 bg-black/45 text-subtle hover:text-muted'
        )}
        aria-label={musicOn ? musicOnLabel : musicOffLabel}
        title={musicOn ? musicOnLabel : musicOffLabel}
      >
        {musicOn ? '🎵' : '🎶'}
      </button>
    </>
  );
}

export function GameStoryPanel({
  events,
  pulseKey,
  soundOn,
  musicOn,
  onSoundToggle,
  onMusicToggle,
  soundOnLabel,
  soundOffLabel,
  musicOnLabel,
  musicOffLabel,
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const latest = events[0];

  const mobileSheet =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[110] flex items-end justify-center max-table-compact:hidden"
              >
                <button
                  type="button"
                  aria-label={closeLabel}
                  className="absolute inset-0 bg-black/55 backdrop-blur-sm"
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="relative z-[1] w-full max-h-[50dvh] rounded-t-2xl border border-gold/25 bg-background/95 shadow-[0_-12px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GlassPanel glow="gold" className="overflow-hidden rounded-t-2xl border-0">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">{title}</p>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-2 py-1 text-xs text-subtle transition hover:bg-white/5 hover:text-muted"
                      >
                        {closeLabel}
                      </button>
                    </div>
                    <FeedList events={events} emptyLabel={emptyLabel} listRef={listRef} />
                  </GlassPanel>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      {/* Desktop layout */}
      <div
        className={cn(
          'pointer-events-auto hidden w-[min(18rem,calc(100vw-1.5rem))] flex-col gap-2 max-table-compact:absolute max-table-compact:left-4 max-table-compact:top-[4.5rem] max-table-compact:z-20 max-table-compact:flex',
          className
        )}
      >
        <AnimatePresence mode="wait">
          {latest && !open ? (
            <motion.div
              key={`${latest.id}-${pulseKey}`}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: [0.96, 1.02, 1],
                transition: { duration: 0.35, ease: 'easeOut' }
              }}
              exit={{ opacity: 0, y: -6 }}
              className={cn('text-sm leading-relaxed sm:text-base', kindStyle[latest.kind])}
            >
              <GlassPanel glow="gold" className="px-3.5 py-3 shadow-[0_0_24px_rgba(232,197,71,0.12)] ring-1 ring-gold/20">
                <span className="mr-2 text-sm opacity-70">{kindIcon[latest.kind]}</span>
                <span className="font-medium">{latest.text}</span>
              </GlassPanel>
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
          <ControlButtons
            soundOn={soundOn}
            musicOn={musicOn}
            onSoundToggle={onSoundToggle}
            onMusicToggle={onMusicToggle}
            soundOnLabel={soundOnLabel}
            soundOffLabel={soundOffLabel}
            musicOnLabel={musicOnLabel}
            musicOffLabel={musicOffLabel}
          />
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
              <GlassPanel glow="gold" className="overflow-hidden">
                <div className="border-b border-white/10 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">{title}</p>
                </div>
                <FeedList events={events} emptyLabel={emptyLabel} listRef={listRef} />
              </GlassPanel>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Mobile toolbar above dock */}
      <div
        data-testid="table-mobile-toolbar"
        className={cn('pointer-events-auto fixed left-3 right-14 z-30 table-compact:block max-table-compact:hidden', tableFabBottomClass)}
      >
        {latest && !open ? (
          <div
            className={cn(
              'mb-1.5 truncate rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] leading-snug backdrop-blur-md',
              kindStyle[latest.kind]
            )}
          >
            <span className="mr-1 opacity-60">{kindIcon[latest.kind]}</span>
            {latest.text}
          </div>
        ) : null}
        <div className="glass-shine flex items-center gap-1 rounded-full border border-white/12 bg-black/70 px-1.5 py-1 shadow-panel backdrop-blur-md">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition',
              open
                ? 'bg-gold/15 text-gold-light'
                : 'text-muted hover:bg-white/5 hover:text-gold-light'
            )}
          >
            <FeedIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="max-w-[5rem] truncate">{open ? closeLabel : openLabel}</span>
            {!open && events.length > 0 ? (
              <span className="rounded-full bg-gold/25 px-1.5 py-0.5 text-[8px] font-mono text-gold-light">
                {events.length}
              </span>
            ) : null}
          </button>
          <span className="h-4 w-px bg-white/10" aria-hidden />
          <ControlButtons
            soundOn={soundOn}
            musicOn={musicOn}
            onSoundToggle={onSoundToggle}
            onMusicToggle={onMusicToggle}
            soundOnLabel={soundOnLabel}
            soundOffLabel={soundOffLabel}
            musicOnLabel={musicOnLabel}
            musicOffLabel={musicOffLabel}
            compact
          />
        </div>
      </div>

      {mobileSheet}
    </>
  );
}
