import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../cn';

export interface ModeCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  description: string;
  icon?: ReactNode;
  bannerUrl?: string;
  selected?: boolean;
}

export function ModeCard({
  title,
  description,
  icon,
  bannerUrl,
  selected,
  className,
  type = 'button',
  ...props
}: ModeCardProps) {
  return (
    <button
      type={type}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border p-0 text-left',
        'bg-gradient-to-br from-surfaceElevated/95 to-surface/90 backdrop-blur-xl',
        'transition-[transform,box-shadow,border-color] duration-300',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        selected
          ? 'border-gold/45 shadow-glow-gold ring-1 ring-gold/25'
          : 'border-white/10 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-glow-gold',
        'active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {bannerUrl ? (
        <div className="relative h-28 w-full overflow-hidden border-b border-white/10 sm:h-32">
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gold/10 via-transparent to-emerald/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
      ) : null}
      <div className="relative p-5 sm:p-6">
        <div className="relative flex flex-col gap-3">
          {icon && (
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl border text-xl transition-colors duration-300',
                selected
                  ? 'border-gold/40 bg-gold/15 text-gold-light shadow-inner-gold'
                  : 'border-white/10 bg-white/[0.04] group-hover:border-gold/25'
              )}
            >
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-display text-lg font-semibold tracking-tight text-gold-light">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
          </div>
          {selected && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-glow" aria-hidden />
              Selected
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
