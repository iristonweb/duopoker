import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary: cn(
    'relative overflow-hidden border border-gold/30',
    'bg-gradient-to-b from-gold-light via-gold to-gold-muted text-background',
    'shadow-glow-gold shadow-inner-gold',
    'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:opacity-80',
    'hover:brightness-105 hover:shadow-[0_0_48px_rgba(232,197,71,0.28)]',
    'active:brightness-95 disabled:opacity-50'
  ),
  secondary: cn(
    'border border-emerald/35 bg-emerald/[0.08] text-emerald',
    'shadow-glow-emerald shadow-inner',
    'hover:border-emerald/50 hover:bg-emerald/[0.14]',
    'active:bg-emerald/[0.1] disabled:opacity-50'
  ),
  ghost: cn(
    'border border-white/10 bg-white/[0.04] text-zinc-100 shadow-inner',
    'hover:border-white/20 hover:bg-white/[0.08]',
    'active:bg-white/[0.06] disabled:opacity-40'
  )
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide',
  md: 'rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide',
  lg: 'rounded-xl px-7 py-3.5 text-base font-semibold tracking-wide'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 transition-[transform,box-shadow,filter] duration-200 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        'disabled:pointer-events-none',
        'active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <span className="relative z-[1]">{children}</span>
    </button>
  );
});
