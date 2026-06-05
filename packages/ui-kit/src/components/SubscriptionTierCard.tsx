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
  children,
  className
}: {
  tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';
  price: string;
  bannerUrl?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel
      glow={tier === 'GOLD' || tier === 'ROYAL' ? 'gold' : 'none'}
      className={cn('overflow-hidden border-white/10 p-0', className)}
    >
      {bannerUrl ? (
        <div className="relative h-24 w-full overflow-hidden">
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/95 via-surface/30 to-transparent" />
          <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60', tierAccent[tier])} />
        </div>
      ) : (
        <div className={cn('h-24 bg-gradient-to-br opacity-90', tierAccent[tier])} aria-hidden />
      )}
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className={cn('font-display text-xl font-semibold tracking-wide', tierLabel[tier])}>{tier}</h3>
          <p className="text-lg font-semibold text-gold">{price}</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">Exclusive cosmetics & perks — no real-money gambling.</p>
        {children ? <div className="mt-4 border-t border-white/10 pt-4">{children}</div> : null}
      </div>
    </GlassPanel>
  );
}
