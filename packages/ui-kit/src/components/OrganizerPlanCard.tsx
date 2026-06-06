import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

const tierAccent: Record<'BASIC' | 'PRO' | 'NETWORK', string> = {
  BASIC: 'from-zinc-400/20 via-zinc-600/10 to-transparent',
  PRO: 'from-emerald-400/25 via-emerald-900/15 to-transparent',
  NETWORK: 'from-gold/30 via-amber-600/15 to-transparent'
};

const tierLabel: Record<'BASIC' | 'PRO' | 'NETWORK', string> = {
  BASIC: 'text-zinc-200',
  PRO: 'text-emerald',
  NETWORK: 'text-gradient-gold'
};

export function OrganizerPlanCard({
  tier,
  price,
  description,
  bannerUrl,
  children,
  className
}: {
  tier: 'BASIC' | 'PRO' | 'NETWORK';
  price: string;
  description?: string;
  bannerUrl?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel
      glow={tier === 'NETWORK' ? 'gold' : tier === 'PRO' ? 'emerald' : 'none'}
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
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {description ?? 'Private club hosting — member limits, invites, moderation. Play-money only.'}
        </p>
        {children ? <div className="mt-4 border-t border-white/10 pt-4">{children}</div> : null}
      </div>
    </GlassPanel>
  );
}
