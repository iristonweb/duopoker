import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

const tierAccent: Record<'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL', string> = {
  SILVER: 'from-zinc-400/20 to-zinc-600/10',
  GOLD: 'from-gold/25 to-amber-600/10',
  PLATINUM: 'from-violet-400/20 to-purple-900/20',
  ROYAL: 'from-rose-400/20 to-amber-500/15'
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
      className={cn(
        'relative overflow-hidden border-white/10 p-0',
        'before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px before:bg-gradient-to-r before:from-transparent before:via-gold/40 before:to-transparent',
        className
      )}
    >
      {bannerUrl ? (
        <div className="relative h-20 w-full overflow-hidden">
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
        </div>
      ) : (
        <div
          className={cn('-mx-4 -mt-4 mb-4 h-20 bg-gradient-to-br opacity-90', tierAccent[tier])}
          aria-hidden
        />
      )}
      <div className="p-4 pt-3">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-wide text-zinc-100">{tier}</h3>
          <p className="text-xl font-semibold text-gold">{price}</p>
        </div>
        <p className="mt-2 text-sm text-muted">Cosmetics & perks — no gambling.</p>
        {children && <div className="mt-4 border-t border-white/10 pt-4">{children}</div>}
      </div>
    </GlassPanel>
  );
}
