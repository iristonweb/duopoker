import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

const tierAccent: Record<'BASIC' | 'PRO' | 'NETWORK', string> = {
  BASIC: 'from-zinc-500/20 to-zinc-700/10',
  PRO: 'from-emerald-400/20 to-emerald-900/20',
  NETWORK: 'from-gold/25 to-amber-600/10'
};

export function OrganizerPlanCard({
  tier,
  price,
  bannerUrl,
  children,
  className
}: {
  tier: 'BASIC' | 'PRO' | 'NETWORK';
  price: string;
  bannerUrl?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={cn('relative overflow-hidden border-white/10 p-0', className)}>
      {bannerUrl ? (
        <div className="relative h-20 w-full overflow-hidden">
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
        </div>
      ) : (
        <div className={cn('h-20 bg-gradient-to-br', tierAccent[tier])} aria-hidden />
      )}
      <div className="p-4 pt-3">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-semibold text-zinc-100">{tier}</h3>
          <p className="text-xl font-semibold text-gold">{price}</p>
        </div>
        <p className="mt-2 text-sm text-muted">Private club hosting — play-money only.</p>
        {children ? <div className="mt-4 border-t border-white/10 pt-4">{children}</div> : null}
      </div>
    </GlassPanel>
  );
}
