import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Card, SessionState } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import {
  mobileOpponentSeatPositionStyle,
  seatPositionStyleForPlayers,
  type TableSurfaceLayout
} from '@duopoker/table-client';
import { PlayingCard } from '../cosmetics/PlayingCard';
import { feltPlayAreaClass } from '../../lib/table-layout';
import { formatCardLabel } from '../../lib/joker-labels';

const STAGGER_MS = 450;

type Props = {
  session: SessionState;
  heroId: string;
  deckId: string;
  label: (uid: string) => string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  reduceMotion?: boolean;
  surfaceLayout?: TableSurfaceLayout;
};

export function TuzovanieTableOverlay({
  session,
  heroId,
  deckId,
  label,
  t,
  reduceMotion,
  surfaceLayout = 'ring'
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

  const tablePlayers = useMemo(
    () => session.players.map((userId) => ({ userId, isHero: userId === heroId })),
    [session.players, heroId]
  );

  const seatIndex = useMemo(
    () => new Map(tablePlayers.map((p, i) => [p.userId, i])),
    [tablePlayers]
  );

  const opponentCount = tablePlayers.filter((p) => !p.isHero).length;

  if (!active || !log) return null;

  const visible = log.slice(0, revealed);
  const last = visible[visible.length - 1];

  const seatStyle = (userId: string) => {
    const idx = seatIndex.get(userId) ?? 0;
    const player = tablePlayers[idx];
    if (surfaceLayout === 'mobile-arc') {
      if (player?.isHero) return { left: '50%', top: '92%', transform: 'translate(-50%, -100%)' };
      const opponentIndex = tablePlayers.slice(0, idx).filter((p) => !p.isHero).length;
      return mobileOpponentSeatPositionStyle(opponentIndex, opponentCount);
    }
    return seatPositionStyleForPlayers(idx, tablePlayers);
  };

  return (
    <div className={cn('pointer-events-none z-[18]', feltPlayAreaClass)}>
      <AnimatePresence>
        {visible.map((entry, i) => {
          if (surfaceLayout === 'mobile-arc' && entry.userId === heroId) return null;
          return (
            <motion.div
              key={`${entry.userId}-${i}-${entry.card}`}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.5, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.28 }}
              className="absolute flex flex-col items-center gap-1"
              style={seatStyle(entry.userId)}
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
          className={cn(
            'absolute left-1/2 z-10 max-w-xs -translate-x-1/2 rounded-full border border-gold/30 bg-black/75 px-4 py-2 text-center text-xs text-gold-light backdrop-blur-md',
            surfaceLayout === 'mobile-arc' ? 'bottom-[22%]' : 'bottom-[18%]'
          )}
        >
          {t('table.feedJokerTuzovanieDealer', { name: label(session.players[session.dealerIndex]!) })}
          {' — '}
          {formatCardLabel(last.card as Card, t)}
        </motion.p>
      ) : null}
    </div>
  );
}
