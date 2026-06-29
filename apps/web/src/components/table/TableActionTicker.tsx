import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';
import type { GameFeedEvent } from '../../hooks/useTableGameFeed';

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
  className?: string;
};

const STREET_BANNER_MS = 1200;

export function TableActionTicker({ events, pulseKey, className }: Props) {
  const { t } = useTranslation();
  const [streetBanner, setStreetBanner] = useState<string | null>(null);
  const prevPulseRef = useRef(pulseKey);

  const recentActions = useMemo(
    () => events.filter((e) => e.kind === 'action').slice(0, 2),
    [events]
  );

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

  if (!recentActions.length && !streetBanner) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 z-[28] flex w-[min(94%,22rem)] -translate-x-1/2 flex-col items-center gap-1',
        className ?? 'top-[68%]'
      )}
    >
      <AnimatePresence mode="wait">
        {streetBanner ? (
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
        ) : null}
      </AnimatePresence>

      {recentActions.length > 0 ? (
        <div className="flex w-full flex-col gap-1">
          {recentActions.map((ev, i) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: i === 0 ? 0 : 8 }}
              animate={{ opacity: i === 0 ? 1 : 0.72, x: 0 }}
              className={cn(
                'truncate rounded-lg border px-3 py-1.5 text-center text-[11px] backdrop-blur-sm sm:text-xs',
                i === 0
                  ? 'border-white/15 bg-black/70 text-ivory'
                  : 'border-white/8 bg-black/45 text-subtle'
              )}
            >
              {ev.text}
            </motion.div>
          ))}
        </div>
      ) : null}

      {!streetBanner && recentActions.length === 0 ? (
        <span className="sr-only">{t('table.feedEmpty')}</span>
      ) : null}
    </div>
  );
}
