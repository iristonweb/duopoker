import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-gold to-amber-500 text-background shadow-glow-gold hover:brightness-105 active:brightness-95 disabled:opacity-50',
  secondary:
    'border border-emerald/40 bg-emerald/10 text-emerald shadow-glow-emerald hover:bg-emerald/20 active:bg-emerald/15 disabled:opacity-50',
  ghost:
    'border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 active:bg-white/[0.08] disabled:opacity-40'
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-sm font-medium',
  md: 'rounded-xl px-4 py-2.5 text-sm font-semibold',
  lg: 'rounded-xl px-6 py-3 text-base font-semibold'
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-[transform,box-shadow,opacity] duration-200 ease-out',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        'disabled:pointer-events-none',
        'active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
});
