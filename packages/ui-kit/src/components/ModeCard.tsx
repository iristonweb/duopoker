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
        'group relative w-full overflow-hidden rounded-2xl border p-0 text-left transition-[transform,box-shadow,border-color] duration-200',
        'bg-gradient-to-br from-surfaceElevated/90 to-surface/80 backdrop-blur-md',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
        selected
          ? 'border-gold/50 shadow-glow-gold ring-1 ring-gold/30'
          : 'border-white/10 hover:border-gold/25 hover:shadow-glow-gold',
        'active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {bannerUrl ? (
        <div className="relative h-24 w-full overflow-hidden border-b border-white/10">
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent" />
        </div>
      ) : null}
      <div className="relative p-6">
        <div
          className={cn(
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
            'bg-gradient-to-br from-gold/5 via-transparent to-emerald/10'
          )}
          aria-hidden
        />
        <div className="relative flex flex-col gap-3">
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-2xl">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold tracking-tight text-gold">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
          </div>
          {selected && (
            <span className="inline-flex w-fit items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-gold">
              Selected
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
