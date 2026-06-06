import type { SubscriptionTier } from '@duopoker/shared-types';
import { tierLabel } from '@duopoker/shared-types';
import { Badge, cn } from '@duopoker/ui-kit';
import {
  avatarGradient,
  frameImageUrl,
  initialsFromName,
  titleDisplayLabel,
  titleImageUrl
} from '../../lib/cosmetics-client';

export function PlayerAvatar({
  name,
  avatarUrl,
  tableStatus,
  frameId = 'frame_none',
  titleId = '',
  tier = 'FREE',
  active = false,
  folded = false,
  size = 'md',
  showTier = false,
  isBot = false,
  className
}: {
  name: string;
  avatarUrl?: string | null;
  tableStatus?: string | null;
  frameId?: string;
  titleId?: string;
  tier?: SubscriptionTier;
  active?: boolean;
  folded?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTier?: boolean;
  isBot?: boolean;
  className?: string;
}) {
  const outer = size === 'sm' ? 'h-12 w-12' : size === 'lg' ? 'h-20 w-20' : 'h-16 w-16';
  const inner = size === 'sm' ? 'h-9 w-9 text-xs' : size === 'lg' ? 'h-14 w-14 text-lg' : 'h-12 w-12 text-sm';
  const titleSrc = titleId ? titleImageUrl(titleId) : undefined;
  const titleText = titleId ? titleDisplayLabel(titleId) : undefined;

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center',
          outer,
          active && 'animate-pulse-glow',
          folded && 'opacity-45 grayscale'
        )}
      >
        <img
          src={frameImageUrl(frameId)}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className={cn('relative z-[1] rounded-full object-cover ring-1 ring-white/10', inner)}
          />
        ) : (
          <div
            className={cn(
              'relative z-[1] flex items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold text-ivory ring-1 ring-white/10',
              avatarGradient(tier),
              inner
            )}
          >
            {initialsFromName(name)}
          </div>
        )}
        {active ? (
          <span className="absolute -bottom-0.5 left-1/2 z-[2] h-2 w-2 -translate-x-1/2 rounded-full bg-emerald shadow-glow-emerald" />
        ) : null}
        {isBot ? (
          <span className="absolute -right-0.5 -top-0.5 z-[3] rounded-md border border-emerald/40 bg-emerald/20 px-1 py-px text-[8px] font-bold uppercase tracking-wide text-emerald">
            AI
          </span>
        ) : null}
      </div>
      <p className={cn('mt-1 max-w-[88px] truncate text-center text-[11px]', active ? 'text-gold-light' : 'text-muted')}>
        {name}
      </p>
      {titleSrc ? (
        <img
          src={titleSrc}
          alt={titleText ?? ''}
          className="mt-0.5 h-4 w-auto max-w-[110px] object-contain"
          title={titleText}
        />
      ) : tableStatus ? (
        <p className="mt-0.5 max-w-[96px] truncate text-center text-[9px] leading-tight text-gold/75" title={tableStatus}>
          {tableStatus}
        </p>
      ) : null}
      {showTier && tier !== 'FREE' ? (
        <Badge variant="gold" className="mt-1 scale-90">
          {tierLabel[tier]}
        </Badge>
      ) : null}
    </div>
  );
}
