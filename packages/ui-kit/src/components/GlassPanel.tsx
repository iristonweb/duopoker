import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../cn';

export type GlassPanelProps = PropsWithChildren<
  { interactive?: boolean; glow?: 'gold' | 'emerald' | 'none' } & HTMLAttributes<HTMLDivElement>
>;

export function GlassPanel({ className, interactive, glow = 'none', children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-shine relative overflow-hidden rounded-2xl border border-white/[0.1]',
        'bg-white/[0.04] p-4 shadow-panel backdrop-blur-glass',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-px',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:shadow-inner',
        glow === 'gold' && 'border-gold/20 shadow-glow-gold',
        glow === 'emerald' && 'border-emerald/20 shadow-glow-emerald',
        interactive &&
          'transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-gold/25 hover:shadow-glow-gold focus-within:border-gold/30',
        className
      )}
      {...props}
    >
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/** @deprecated Use GlassPanel */
export const GlassCard = GlassPanel;
