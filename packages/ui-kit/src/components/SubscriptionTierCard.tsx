import type { ReactNode } from 'react';
import { Button } from './Button';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

export type PaidSubscriptionTierUi =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'BLACK';

const tierAccent: Record<PaidSubscriptionTierUi, string> = {
  BRONZE: 'from-amber-700/25 via-orange-900/15 to-transparent',
  SILVER: 'from-zinc-300/25 via-zinc-500/10 to-transparent',
  GOLD: 'from-gold/30 via-amber-500/15 to-transparent',
  PLATINUM: 'from-violet-400/25 via-purple-900/15 to-transparent',
  DIAMOND: 'from-cyan-400/25 via-sky-900/15 to-transparent',
  BLACK: 'from-amber-300/20 via-zinc-900/30 to-transparent'
};

const tierBorder: Record<PaidSubscriptionTierUi, string> = {
  BRONZE: 'border-amber-700/25',
  SILVER: 'border-zinc-400/20',
  GOLD: 'border-gold/25',
  PLATINUM: 'border-violet-400/25',
  DIAMOND: 'border-cyan-400/25',
  BLACK: 'border-amber-500/30'
};

const tierLabel: Record<PaidSubscriptionTierUi, string> = {
  BRONZE: 'text-amber-300',
  SILVER: 'text-zinc-200',
  GOLD: 'text-gold-light',
  PLATINUM: 'text-violet-200',
  DIAMOND: 'text-cyan-200',
  BLACK: 'text-gradient-gold'
};

const tierBadge: Record<PaidSubscriptionTierUi, string> = {
  BRONZE: 'border-amber-600/35 bg-amber-800/20 text-amber-200',
  SILVER: 'border-zinc-400/30 bg-zinc-500/15 text-zinc-200',
  GOLD: 'border-gold/35 bg-gold/15 text-gold-light',
  PLATINUM: 'border-violet-400/35 bg-violet-500/15 text-violet-200',
  DIAMOND: 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200',
  BLACK: 'border-amber-500/35 bg-zinc-900/40 text-amber-200'
};

const tierRing: Record<PaidSubscriptionTierUi, string> = {
  BRONZE: 'ring-amber-600/35 shadow-[0_0_32px_rgba(180,83,9,0.15)]',
  SILVER: 'ring-zinc-400/40 shadow-[0_0_40px_rgba(161,161,170,0.15)]',
  GOLD: 'ring-gold/45 shadow-glow-gold',
  PLATINUM: 'ring-violet-400/40 shadow-[0_0_48px_rgba(167,139,250,0.2)]',
  DIAMOND: 'ring-cyan-400/40 shadow-[0_0_48px_rgba(34,211,238,0.2)]',
  BLACK: 'ring-amber-500/45 shadow-[0_0_56px_rgba(201,162,39,0.22)]'
};

export function SubscriptionTierCard({
  tier,
  price,
  bannerUrl,
  tierName,
  perkDescription,
  active = false,
  featured = false,
  onViewDetails,
  viewDetailsLabel = 'View details',
  children,
  className
}: {
  tier: PaidSubscriptionTierUi;
  price: string;
  bannerUrl?: string;
  tierName?: string;
  perkDescription?: string;
  active?: boolean;
  featured?: boolean;
  onViewDetails?: () => void;
  viewDetailsLabel?: string;
  children?: ReactNode;
  className?: string;
}) {
  const label = tierName ?? tier;
  const summary =
    perkDescription ?? 'Exclusive cosmetics & perks — no real-money gambling.';

  const glow =
    active || tier === 'GOLD' || tier === 'BLACK'
      ? 'gold'
      : tier === 'PLATINUM' || tier === 'DIAMOND'
        ? 'emerald'
        : 'none';

  return (
    <GlassPanel
      glow={glow}
      className={cn(
        'overflow-hidden border-white/10 p-0 transition-all duration-300',
        tierBorder[tier],
        active && cn('ring-2', tierRing[tier]),
        featured && !active && 'ring-1 ring-gold/20',
        className
      )}
    >
      <div className="relative aspect-[2/1] w-full overflow-hidden bg-[#050508]">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', tierAccent[tier])} aria-hidden />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/80 via-surface/10 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm',
              tierBadge[tier]
            )}
          >
            {label}
          </span>
          {active ? (
            <span className="rounded-full border border-emerald/40 bg-emerald/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald backdrop-blur-sm">
              Active
            </span>
          ) : null}
          {featured && !active ? (
            <span className="rounded-full border border-gold/35 bg-gold/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-light backdrop-blur-sm">
              Best value
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className={cn('font-display text-lg font-semibold tracking-wide sm:text-xl', tierLabel[tier])}>
            {label}
          </h3>
          <p className="shrink-0 text-base font-semibold text-gold sm:text-lg">{price}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{summary}</p>
        {onViewDetails ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <Button variant="ghost" size="sm" type="button" onClick={onViewDetails}>
              {viewDetailsLabel}
            </Button>
          </div>
        ) : null}
        {children ? <div className={cn('mt-4', !onViewDetails && 'border-t border-white/10 pt-4')}>{children}</div> : null}
      </div>
    </GlassPanel>
  );
}
