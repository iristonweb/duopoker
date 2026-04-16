import type { HTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '../cn';

export type GlassPanelProps = PropsWithChildren<
  { interactive?: boolean } & HTMLAttributes<HTMLDivElement>
>;

export function GlassPanel({ className, interactive, children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 shadow-panel backdrop-blur-glass',
        'bg-gradient-to-br from-white/[0.09] to-transparent',
        interactive &&
          'transition-[box-shadow,transform,border-color] duration-200 hover:border-gold/25 hover:shadow-glow-gold focus-within:border-gold/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** @deprecated Use GlassPanel */
export const GlassCard = GlassPanel;
