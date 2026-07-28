import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import type { GameFeedEvent } from '../../hooks/useTableGameFeed';

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
  className?: string;
  /** Kept for API compatibility; mid-felt action lines are never shown (seat-local primary). */
  hideWhenHeroActive?: boolean;
};

const STREET_BANNER_MS = 1400;

/** Mid-felt street banners only — fold/call/bid live on seats + history FAB. */
export function TableActionTicker({ events, pulseKey, className }: Props) {
  const [streetBanner, setStreetBanner] = useState<string | null>(null);
  const prevPulseRef = useRef(pulseKey);

  useEffect(() => {
    if (pulseKey === prevPulseRef.current) return;
    prevPulseRef.current = pulseKey;
    const latest = events[0];
    if (latest?.kind === 'street') {
      setStreetBanner(latest.text);
      const timer = window.setTimeout(() => setStreetBanner(null), STREET_BANNER_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pulseKey, events]);

  if (!streetBanner) return null;

  return (
    <div
      data-testid="table-action-ticker"
      className={cn(
        'pointer-events-none absolute left-1/2 z-[28] flex w-[min(88%,20rem)] -translate-x-1/2 flex-col items-center gap-1',
        className ?? 'top-[42%]'
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={streetBanner}
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          className="rounded-xl border border-gold/45 bg-black/75 px-5 py-2 text-center shadow-glow-gold backdrop-blur-md"
        >
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold-light sm:text-base">
            {streetBanner}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
