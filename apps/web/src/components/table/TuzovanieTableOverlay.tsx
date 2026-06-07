import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, SessionState } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { rotatePlayersForHero, seatLayout, feltPlayAreaClass } from '../../lib/table-layout';
import { formatCardLabel } from '../../lib/joker-labels';

const STAGGER_MS = 450;

type Props = {
  session: SessionState;
  heroId: string;
  deckId: string;
  label: (uid: string) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  reduceMotion?: boolean;
};

export function TuzovanieTableOverlay({
  session,
  heroId,
  deckId,
  label,
  t,
  reduceMotion
}: Props) {
  const log = session.joker?.tuzovanieLog;
  const active =
    session.mode === 'JOKER' &&
    session.handNumber === 1 &&
    log &&
    log.length > 0 &&
    session.street === 'LOBBY';

  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!active || !log?.length) {
      setRevealed(0);
      return;
    }
    setRevealed(0);
    if (reduceMotion) {
      setRevealed(log.length);
      return;
    }
    const timers = log.map((_, i) => setTimeout(() => setRevealed(i + 1), i * STAGGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [active, log, reduceMotion, session.sessionId]);

  const seatIndex = useMemo(() => {
    const order = rotatePlayersForHero(
      session.players.map((userId) => ({ userId })),
      heroId
    );
    return new Map(order.map((p, i) => [p.userId, i]));
  }, [session.players, heroId]);

  if (!active || !log) return null;

  const visible = log.slice(0, revealed);
  const last = visible[visible.length - 1];

  return (
    <div className={cn('pointer-events-none z-[18]', feltPlayAreaClass)}>
      <AnimatePresence>
        {visible.map((entry, i) => {
          const idx = seatIndex.get(entry.userId) ?? 0;
          return (
            <motion.div
              key={`${entry.userId}-${i}-${entry.card}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.5, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.28 }}
              className={cn('absolute flex flex-col items-center gap-1', seatLayout(idx, session.players.length))}
            >
              <PlayingCard card={entry.card as Card} deckId={deckId} size="sm" />
              <span className="rounded-full bg-black/70 px-2 py-0.5 text-[9px] text-gold-light backdrop-blur-sm">
                {label(entry.userId)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {last && revealed >= log.length ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-[18%] left-1/2 z-10 max-w-xs -translate-x-1/2 rounded-full border border-gold/30 bg-black/75 px-4 py-2 text-center text-xs text-gold-light backdrop-blur-md"
        >
          {t('table.feedJokerTuzovanieDealer', { name: label(session.players[session.dealerIndex]!) })}
          {' — '}
          {formatCardLabel(last.card as Card, t)}
        </motion.p>
      ) : null}
    </div>
  );
}
