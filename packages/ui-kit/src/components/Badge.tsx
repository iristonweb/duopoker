import type { ReactNode } from 'react';
import { cn } from '../cn';

const variants = {
  default: 'border-white/15 bg-white/10 text-zinc-200',
  gold: 'border-gold/30 bg-gold/10 text-gold-light',
  emerald: 'border-emerald/30 bg-emerald/10 text-emerald',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300'
} as const;

export function Badge({
  variant = 'default',
  className,
  children
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
