import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

const tierAccent: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'from-zinc-300/25 via-zinc-500/10 to-transparent',
  GOLD: 'from-gold/30 via-amber-500/15 to-transparent',
  PLATINUM: 'from-violet-400/25 via-purple-900/15 to-transparent',
  ROYAL: 'from-rose-300/25 via-gold/20 to-transparent'
};

const tierBorder: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'border-zinc-400/20',
  GOLD: 'border-gold/25',
  PLATINUM: 'border-violet-400/25',
  ROYAL: 'border-rose-400/25'
};

const tierLabel: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'text-zinc-200',
  GOLD: 'text-gold-light',
  PLATINUM: 'text-violet-200',
  ROYAL: 'text-gradient-gold'
};

const tierBadge: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'border-zinc-400/30 bg-zinc-500/15 text-zinc-200',
  GOLD: 'border-gold/35 bg-gold/15 text-gold-light',
  PLATINUM: 'border-violet-400/35 bg-violet-500/15 text-violet-200',
  ROYAL: 'border-rose-400/35 bg-rose-500/15 text-rose-200'
};

export function SubscriptionTierCard({
  tier,
  price,
  bannerUrl,
  tierName,
  perkDescription,
  children,
  className
}: {
  tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';
  price: string;
  bannerUrl?: string;
  tierName?: string;
  perkDescription?: string;
  children?: ReactNode;
  className?: string;
}) {
  const label = tierName ?? tier;
  const perks =
    perkDescription ?? 'Exclusive cosmetics & perks — no real-money gambling.';

  return (
    <GlassPanel
      glow={tier === 'GOLD' || tier === 'ROYAL' ? 'gold' : tier === 'PLATINUM' ? 'emerald' : 'none'}
      className={cn('overflow-hidden border-white/10 p-0', tierBorder[tier], className)}
    >
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-[#050508]">
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
        <span
          className={cn(
            'absolute left-3 top-3 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm',
            tierBadge[tier]
          )}
        >
          {label}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className={cn('font-display text-lg font-semibold tracking-wide sm:text-xl', tierLabel[tier])}>
            {label}
          </h3>
          <p className="shrink-0 text-base font-semibold text-gold sm:text-lg">{price}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{perks}</p>
        {children ? <div className="mt-4 border-t border-white/10 pt-4">{children}</div> : null}
      </div>
    </GlassPanel>
  );
}
