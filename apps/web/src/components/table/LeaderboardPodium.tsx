import { useTranslation } from 'react-i18next';
import type { EquippedCosmetics, GameMode, SubscriptionTier } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { cn } from '@duopoker/ui-kit';
import { PlayerAvatar } from '../cosmetics/PlayerAvatar';
import { initialsFromName } from '../../lib/cosmetics-client';

export type LeaderboardProfile = {
  name: string;
  avatar?: string | null;
  subscriptionTier?: SubscriptionTier;
  equipped?: EquippedCosmetics;
};

const rankMedal = (rank: number): string | null => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return null;
};

/** Visual podium order: silver · gold · bronze */
function podiumOrder(entries: TableLeaderboardEntry[]): TableLeaderboardEntry[] {
  const top = entries.slice(0, 3);
  if (top.length <= 1) return top;
  const sorted = [...top].sort((a, b) => a.rank - b.rank || a.score - b.score);
  if (sorted.length === 2) return sorted;
  const first = sorted.find((e) => e.rank === 1) ?? sorted[0]!;
  const second = sorted.find((e) => e.rank === 2) ?? sorted[1]!;
  const third = sorted.find((e) => e.rank === 3) ?? sorted[2]!;
  return [second, first, third];
}

type Props = {
  entries: TableLeaderboardEntry[];
  mode: GameMode;
  heroId?: string;
  profiles: Record<string, LeaderboardProfile>;
  onClick?: () => void;
  compact?: boolean;
  className?: string;
};

function PodiumSlot({
  entry,
  heroId,
  profile,
  compact
}: {
  entry: TableLeaderboardEntry;
  heroId?: string;
  profile?: LeaderboardProfile;
  compact?: boolean;
}) {
  const name = profile?.name ?? entry.userId.slice(0, 6);
  const medal = rankMedal(entry.rank);
  const isFirst = entry.rank === 1;

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1',
        isFirst && !compact && '-translate-y-1',
        entry.userId === heroId && 'rounded-xl ring-1 ring-gold/45 ring-offset-1 ring-offset-transparent'
      )}
    >
      <div className="relative">
        {profile ? (
          <PlayerAvatar
            name={name}
            avatarUrl={profile.avatar}
            frameId={profile.equipped?.frame ?? 'frame_none'}
            tier={profile.subscriptionTier ?? 'FREE'}
            size="sm"
            hideName
            className={cn(
              isFirst ? 'scale-[0.82] sm:scale-100' : 'scale-[0.68] sm:scale-[0.82]',
              isFirst && 'drop-shadow-[0_0_16px_rgba(232,197,71,0.35)]'
            )}
          />
        ) : (
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-gold/10 font-semibold text-ivory ring-1 ring-white/10',
              isFirst ? 'h-9 w-9 text-[11px] sm:h-10 sm:w-10' : 'h-8 w-8 text-[10px]'
            )}
          >
            {initialsFromName(name)}
          </div>
        )}
        {medal ? (
          <span className="absolute -right-1 -top-1 text-[11px] drop-shadow-md">{medal}</span>
        ) : (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black/70 text-[8px] font-bold text-gold">
            {entry.rank}
          </span>
        )}
      </div>
      <span
        className={cn(
          'font-mono font-bold leading-none text-gold-light',
          isFirst ? 'text-[10px] sm:text-[11px]' : 'text-[9px]'
        )}
      >
        {entry.score.toLocaleString()}
      </span>
      <span
        className={cn(
          'rounded-t-md',
          isFirst
            ? 'h-2 w-7 bg-gradient-to-t from-gold/50 to-gold/20 sm:h-2.5 sm:w-8'
            : entry.rank === 2
              ? 'h-1.5 w-6 bg-gradient-to-t from-zinc-400/35 to-zinc-400/10'
              : 'h-1 w-5 bg-gradient-to-t from-amber-700/35 to-amber-700/10'
        )}
      />
    </div>
  );
}

export function LeaderboardPodium({
  entries,
  mode,
  heroId,
  profiles,
  onClick,
  compact = false,
  className
}: Props) {
  const { t } = useTranslation();
  const top = podiumOrder(entries);
  if (!top.length) return null;

  const scoreLabel = mode === 'JOKER' ? t('table.leaderboardPoints') : t('table.leaderboardChips');
  const shellClass = cn(
    'group relative flex items-end gap-0.5 rounded-2xl border border-gold/25 bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition',
    onClick &&
      'cursor-pointer hover:border-gold/45 hover:from-gold/[0.08] hover:to-white/[0.03] hover:shadow-[0_0_24px_rgba(232,197,71,0.18)]',
    compact ? 'scale-90 rounded-full px-1.5 py-1' : 'px-2.5 py-2',
    className
  );

  const content = (
    <>
      {!compact ? (
        <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      ) : null}
      {top.map((entry) => (
        <PodiumSlot
          key={entry.userId}
          entry={entry}
          heroId={heroId}
          profile={profiles[entry.userId]}
          compact={compact}
        />
      ))}
      {!compact ? (
        <span className="mb-1 ml-1 hidden text-[8px] font-semibold uppercase tracking-[0.2em] text-gold/50 group-hover:text-gold/75 sm:inline">
          {scoreLabel}
        </span>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-testid="leaderboard-podium"
        onClick={onClick}
        className={shellClass}
        aria-label={t('table.openLeaderboard')}
        title={t('table.openLeaderboard')}
      >
        {content}
      </button>
    );
  }

  return (
    <div data-testid="leaderboard-podium" className={shellClass}>
      {content}
    </div>
  );
}
