import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

const tierAccent: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'from-zinc-300/25 via-zinc-500/10 to-transparent',
  GOLD: 'from-gold/30 via-amber-500/15 to-transparent',
  PLATINUM: 'from-violet-400/25 via-purple-900/15 to-transparent',
  ROYAL: 'from-rose-300/25 via-gold/20 to-transparent'
};

const tierLabel: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'text-zinc-200',
  GOLD: 'text-gold-light',
  PLATINUM: 'text-violet-200',
  ROYAL: 'text-gradient-gold'
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
      glow={tier === 'GOLD' || tier === 'ROYAL' ? 'gold' : 'none'}
      className={cn('overflow-hidden border-white/10 p-0', className)}
    >
      <div className="relative aspect-[5/1] min-h-[72px] w-full overflow-hidden bg-black/50">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain object-center"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', tierAccent[tier])} aria-hidden />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/70 via-transparent to-transparent" />
        <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40', tierAccent[tier])} />
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className={cn('font-display text-xl font-semibold tracking-wide', tierLabel[tier])}>{label}</h3>
          <p className="text-lg font-semibold text-gold">{price}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">{perks}</p>
        {children ? <div className="mt-4 border-t border-white/10 pt-4">{children}</div> : null}
      </div>
    </GlassPanel>
  );
}
