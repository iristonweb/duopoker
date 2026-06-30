import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameMode } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { GlassPanel, cn } from '@duopoker/ui-kit';
import { PlayerAvatar } from '../cosmetics/PlayerAvatar';
import { tableFabBottomClass, tableLeaderboardFabBottomClass } from '../../hooks/useTableDockHeight';
import type { LeaderboardProfile } from './LeaderboardPodium';
import { TrophyIcon } from './TrophyIcon';

const rankRowClass = (rank: number, isHero: boolean): string => {
  if (isHero) return 'bg-gold/[0.1] ring-1 ring-inset ring-gold/25';
  if (rank === 1) return 'bg-gradient-to-r from-gold/[0.12] via-gold/[0.04] to-transparent';
  if (rank === 2) return 'bg-gradient-to-r from-zinc-400/[0.08] via-transparent to-transparent';
  if (rank === 3) return 'bg-gradient-to-r from-amber-700/[0.1] via-transparent to-transparent';
  return '';
};

const rankStyle = (rank: number): string => {
  if (rank === 1) return 'text-gold-light';
  if (rank === 2) return 'text-zinc-300';
  if (rank === 3) return 'text-amber-600/90';
  return 'text-subtle';
};

const rankIcon = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

type Props = {
  entries: TableLeaderboardEntry[];
  mode: GameMode;
  heroId?: string;
  profiles: Record<string, LeaderboardProfile>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showFab?: boolean;
  buyIn?: number;
  className?: string;
};

function LeaderboardList({
  entries,
  mode,
  heroId,
  profiles,
  buyIn
}: Pick<Props, 'entries' | 'mode' | 'heroId' | 'profiles' | 'buyIn'>) {
  const { t } = useTranslation();
  const scoreHeader = mode === 'JOKER' ? t('table.leaderboardPoints') : t('table.leaderboardChips');

  if (!entries.length) {
    return (
      <div className="px-3 py-8 text-center text-xs text-subtle">{t('table.leaderboardEmpty')}</div>
    );
  }

  return (
    <div className="premium-scroll max-h-[min(50vh,22rem)] overflow-y-auto sm:max-h-[min(55dvh,24rem)]">
      <div className="sticky top-0 z-10 grid grid-cols-[2rem_1fr_5rem_4rem] gap-2 border-b border-white/10 bg-background/90 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-subtle backdrop-blur-sm">
        <span>#</span>
        <span>{t('table.leaderboard')}</span>
        <span className="text-right">{scoreHeader}</span>
        <span className="text-right">{t('table.leaderboardHandDelta')}</span>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {entries.map((entry) => {
          const profile = profiles[entry.userId];
          const name = profile?.name ?? entry.userId.slice(0, 8);
          const isHero = entry.userId === heroId;
          const delta = entry.handDelta;
          const netPl = mode === 'HOLDEM' && buyIn !== undefined ? entry.score - buyIn : undefined;

          return (
            <li
              key={entry.userId}
              data-testid="leaderboard-row"
              className={cn(
                'grid grid-cols-[2rem_1fr_5rem_4rem] items-center gap-2 px-3 py-2.5 transition',
                rankRowClass(entry.rank, isHero)
              )}
            >
              <span className={cn('text-sm font-bold', rankStyle(entry.rank))}>
                {rankIcon(entry.rank)}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                {profile ? (
                  <PlayerAvatar
                    name={name}
                    avatarUrl={profile.avatar}
                    frameId={profile.equipped?.frame ?? 'frame_none'}
                    tier={profile.subscriptionTier ?? 'FREE'}
                    size="sm"
                    hideName
                    className="scale-75"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ivory">
                    {name}
                    {isHero ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-gold/70">
                        ({t('table.leaderboardYou')})
                      </span>
                    ) : null}
                  </p>
                  {netPl !== undefined ? (
                    <p
                      className={cn('text-[10px]', netPl >= 0 ? 'text-emerald/80' : 'text-rose/80')}
                    >
                      {netPl >= 0 ? '+' : ''}
                      {netPl.toLocaleString()}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="text-right font-mono text-sm font-bold text-gold-light">
                {entry.score.toLocaleString()}
              </span>
              <span
                className={cn(
                  'text-right font-mono text-xs font-semibold',
                  delta === undefined
                    ? 'text-subtle/40'
                    : delta > 0
                      ? 'text-emerald'
                      : delta < 0
                        ? 'text-rose'
                        : 'text-subtle'
                )}
              >
                {delta === undefined ? '—' : delta > 0 ? `+${delta}` : String(delta)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TableLeaderboardPanel({
  entries,
  mode,
  heroId,
  profiles,
  open,
  onOpenChange,
  showFab = true,
  buyIn,
  className
}: Props) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  const mobileSheet =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-end justify-center max-table-compact:hidden"
              >
                <button
                  type="button"
                  aria-label={t('table.leaderboardClose')}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => onOpenChange(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="relative z-10 w-full max-w-lg rounded-t-2xl border border-gold/25 bg-background/95 shadow-[0_-8px_48px_rgba(0,0,0,0.5)]"
                  data-testid="table-leaderboard-sheet"
                >
                  <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/60">
                      {t('table.liveTable')}
                    </p>
                    <h2 className="font-display text-lg font-semibold text-gradient-gold">
                      {t('table.leaderboardTitle')}
                    </h2>
                  </div>
                  <div ref={listRef}>
                    <LeaderboardList
                      entries={entries}
                      mode={mode}
                      heroId={heroId}
                      profiles={profiles}
                      buyIn={buyIn}
                    />
                  </div>
                  <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                    <button
                      type="button"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-semibold text-muted transition hover:border-gold/30 hover:text-gold-light"
                      onClick={() => onOpenChange(false)}
                    >
                      {t('table.leaderboardClose')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )
      : null;

  return (
    <>
      {mobileSheet}
      {showFab ? (
        <button
          type="button"
          data-testid="table-leaderboard-fab"
          aria-label={t('table.openLeaderboard')}
          title={t('table.openLeaderboard')}
          onClick={() => onOpenChange(true)}
          className={cn(
            'absolute right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full',
            'border border-gold/35 bg-black/55 text-gold-light shadow-[0_0_24px_rgba(232,197,71,0.2)] backdrop-blur-md',
            'transition hover:border-gold/55 hover:bg-gold/10 hover:shadow-glow-gold',
            open && 'border-gold/60 bg-gold/15 shadow-glow-gold ring-2 ring-gold/25',
            tableLeaderboardFabBottomClass,
            className
          )}
        >
          <TrophyIcon className="h-5 w-5" />
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-label={t('table.leaderboardClose')}
              className="absolute inset-0 z-20 hidden bg-black/20 backdrop-blur-[1px] max-table-compact:block"
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'absolute right-3 z-30 hidden w-[min(22rem,calc(100%-1.5rem))] max-table-compact:block',
                tableFabBottomClass,
                className
              )}
              data-testid="table-leaderboard-panel"
            >
              <GlassPanel
                glow="gold"
                className="relative overflow-hidden border-gold/25 p-0 shadow-[0_0_48px_rgba(232,197,71,0.18)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-gold/[0.08] to-transparent" />
                <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/60">
                      {t('table.liveTable')}
                    </p>
                    <h2 className="font-display text-base font-semibold text-gradient-gold">
                      {t('table.leaderboardTitle')}
                    </h2>
                  </div>
                  <button
                    type="button"
                    aria-label={t('table.leaderboardClose')}
                    className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-subtle transition hover:border-gold/30 hover:text-gold-light"
                    onClick={() => onOpenChange(false)}
                  >
                    ✕
                  </button>
                </div>
                <LeaderboardList
                  entries={entries}
                  mode={mode}
                  heroId={heroId}
                  profiles={profiles}
                  buyIn={buyIn}
                />
              </GlassPanel>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
