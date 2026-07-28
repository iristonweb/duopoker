import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { GameMode } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { Button, GlassPanel, cn } from '@duopoker/ui-kit';
import { LeaderboardPodium, type LeaderboardProfile } from './LeaderboardPodium';

type Props = {
  visible: boolean;
  winners?: string;
  /** When set, replaces the winners line (e.g. Joker hand points). */
  summaryText?: string;
  /** Winning hand rank(s) at showdown (Hold'em). */
  handRankLine?: string;
  /** Side pot breakdown when multiple pots exist. */
  sidePotLine?: string;
  summaryHeading?: string;
  gameOver: boolean;
  gameOverMessage?: string;
  nextHandSeconds: number | null;
  canPeekGhostBoard?: boolean;
  ghostBoardVisible?: boolean;
  onToggleGhostBoard?: () => void;
  showGhostUpsell?: boolean;
  leaderboardEntries?: TableLeaderboardEntry[];
  leaderboardProfiles?: Record<string, LeaderboardProfile>;
  heroId?: string;
  mode?: GameMode;
  buyIn?: number;
  className?: string;
};

export function HandResultOverlay({
  visible,
  winners,
  summaryText,
  handRankLine,
  sidePotLine,
  summaryHeading,
  gameOver,
  gameOverMessage,
  nextHandSeconds,
  canPeekGhostBoard = false,
  ghostBoardVisible = false,
  onToggleGhostBoard,
  showGhostUpsell = false,
  leaderboardEntries,
  leaderboardProfiles = {},
  heroId,
  mode = 'HOLDEM',
  buyIn,
  className
}: Props) {
  const { t } = useTranslation();
  const resultLine =
    summaryText !== undefined
      ? summaryText
      : t('table.winners', { names: winners || '—' });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn('absolute inset-x-0 z-20 flex justify-center', className)}
          style={{
            top: 'max(1rem, 12%)',
            paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
          }}
        >
          <GlassPanel
            glow="gold"
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              'relative max-w-lg overflow-hidden px-4 py-3 text-center text-sm shadow-[0_0_48px_rgba(232,197,71,0.2)] sm:px-6 sm:py-4 sm:text-base',
              gameOver && 'ring-1 ring-gold/30'
            )}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-1 w-1 rounded-full bg-gold/60"
                  initial={{
                    x: `${20 + i * 15}%`,
                    y: '50%',
                    opacity: 0.8,
                    scale: 1
                  }}
                  animate={{
                    y: ['50%', `${20 + i * 8}%`, '80%'],
                    opacity: [0.8, 0.4, 0],
                    scale: [1, 0.5, 0]
                  }}
                  transition={{ duration: 1.8, delay: i * 0.15, repeat: Infinity, repeatDelay: 2 }}
                />
              ))}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
              {summaryHeading ?? t('table.handResult')}
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-gradient-gold sm:text-2xl">
              {gameOver ? t('table.gameOver') : t('table.handComplete')}
            </p>
            {!gameOver ? <p className="mt-2 text-sm text-muted">{resultLine}</p> : null}
            {handRankLine ? <p className="mt-1 text-xs text-subtle">{handRankLine}</p> : null}
            {sidePotLine ? <p className="mt-1 text-[11px] text-subtle/90">{sidePotLine}</p> : null}
            {gameOver && leaderboardEntries?.length ? (
              <div className="mt-4 flex flex-col items-center gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/60">
                  👑 {t('table.leaderboardTitle')}
                </p>
                <LeaderboardPodium
                  entries={leaderboardEntries}
                  mode={mode}
                  heroId={heroId}
                  profiles={leaderboardProfiles}
                />
                <div className="w-full space-y-1 border-t border-white/10 pt-3 text-left">
                  {leaderboardEntries.slice(0, 5).map((entry) => {
                    const name = leaderboardProfiles[entry.userId]?.name ?? entry.userId.slice(0, 8);
                    const delta = entry.handDelta;
                    const netPl =
                      mode === 'HOLDEM' && buyIn !== undefined ? entry.score - buyIn : undefined;
                    return (
                      <div
                        key={entry.userId}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs',
                          entry.rank === 1 && 'bg-gold/[0.12] ring-1 ring-gold/20',
                          entry.rank === 2 && 'bg-white/[0.03]',
                          entry.rank === 3 && 'bg-amber-900/[0.08]',
                          entry.userId === heroId && entry.rank !== 1 && 'bg-gold/[0.08]'
                        )}
                      >
                        <span className="truncate text-muted">
                          #{entry.rank} {name}
                        </span>
                        <span className="shrink-0 font-mono font-semibold text-gold-light">
                          {entry.score.toLocaleString()}
                          {netPl !== undefined ? (
                            <span className={cn('ml-1 text-[10px]', netPl >= 0 ? 'text-emerald' : 'text-rose')}>
                              ({netPl >= 0 ? '+' : ''}
                              {netPl})
                            </span>
                          ) : delta !== undefined ? (
                            <span className={cn('ml-1 text-[10px]', delta >= 0 ? 'text-emerald' : 'text-rose')}>
                              ({delta >= 0 ? '+' : ''}
                              {delta})
                            </span>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {canPeekGhostBoard && onToggleGhostBoard ? (
              <div className="pointer-events-auto mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="border-gold/25 text-xs uppercase tracking-wider"
                  onClick={onToggleGhostBoard}
                >
                  {ghostBoardVisible ? t('table.hideGhostBoard') : t('table.peekGhostBoard')}
                </Button>
                {ghostBoardVisible ? (
                  <p className="mt-2 text-[11px] text-subtle">{t('table.ghostBoardHint')}</p>
                ) : null}
              </div>
            ) : null}
            {showGhostUpsell ? (
              <div className="pointer-events-auto mt-3 space-y-2">
                <p className="text-[11px] text-subtle">{t('table.ghostBoardUpsell')}</p>
                <Link
                  to="/lobby#subscriptions"
                  className="inline-flex text-xs font-semibold uppercase tracking-wider text-gold hover:text-gold-light"
                >
                  {t('table.ghostBoardSubscribe')}
                </Link>
              </div>
            ) : null}
            {gameOver ? (
              <p className="mt-3 text-sm font-medium text-gradient-gold">
                {gameOverMessage ?? t('table.gameOver')}
              </p>
            ) : nextHandSeconds !== null && nextHandSeconds > 0 ? (
              <p className="mt-2 text-xs text-subtle">
                {t('table.nextHandAuto', { seconds: nextHandSeconds })}
              </p>
            ) : (
              <p className="mt-2 text-xs text-subtle">{t('table.dealingNext')}</p>
            )}
          </GlassPanel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
