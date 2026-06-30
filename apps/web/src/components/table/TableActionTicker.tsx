import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';
import type { GameFeedEvent } from '../../hooks/useTableGameFeed';

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
  className?: string;
  hideWhenHeroActive?: boolean;
};

const STREET_BANNER_MS = 1200;

export function TableActionTicker({
  events,
  pulseKey,
  className,
  hideWhenHeroActive = false
}: Props) {
  const { t } = useTranslation();
  const [streetBanner, setStreetBanner] = useState<string | null>(null);
  const prevPulseRef = useRef(pulseKey);

  const latestAction = useMemo(
    () => events.find((e) => e.kind === 'action'),
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

  if (hideWhenHeroActive) return null;
  if (!latestAction && !streetBanner) return null;

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 z-[28] flex w-[min(88%,20rem)] -translate-x-1/2 flex-col items-center gap-1',
        className ?? 'top-[42%]'
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
        ) : latestAction ? (
          <motion.div
            key={latestAction.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="w-full truncate rounded-lg border border-white/18 bg-black/75 px-3 py-1.5 text-center text-[11px] font-medium text-ivory shadow-[0_4px_20px_rgba(0,0,0,0.45)] backdrop-blur-md sm:text-xs"
          >
            {latestAction.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!streetBanner && !latestAction ? (
        <span className="sr-only">{t('table.feedEmpty')}</span>
      ) : null}
    </div>
  );
}
