import type { ReactNode } from 'react';
import { cn } from '../cn';

export type OpponentKind = 'HUMAN' | 'BOT';

export interface OpponentSelectorOption {
  id: OpponentKind;
  label: string;
  hint: string;
  icon?: ReactNode;
}

const defaultIcons: Record<OpponentKind, ReactNode> = {
  HUMAN: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M4 20a8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M19 8a3 3 0 1 0 0-6M22 11a5 5 0 0 0-3-4.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  BOT: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
      <rect x="5" y="8" width="14" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 12h.01M15 12h.01M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 4v3M8 4h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
};

const accentStyles: Record<
  OpponentKind,
  { idle: string; active: string; iconIdle: string; iconActive: string }
> = {
  HUMAN: {
    idle: 'border-white/10 hover:border-gold/30 hover:shadow-glow-gold',
    active: 'border-gold/45 bg-gradient-to-br from-gold/[0.12] to-transparent shadow-glow-gold ring-1 ring-gold/25',
    iconIdle: 'border-white/10 bg-white/[0.04] text-zinc-300 group-hover:border-gold/25',
    iconActive: 'border-gold/40 bg-gold/15 text-gold-light shadow-inner-gold'
  },
  BOT: {
    idle: 'border-white/10 hover:border-emerald/35 hover:shadow-glow-emerald',
    active:
      'border-emerald/45 bg-gradient-to-br from-emerald/[0.12] to-transparent shadow-glow-emerald ring-1 ring-emerald/25',
    iconIdle: 'border-white/10 bg-white/[0.04] text-zinc-300 group-hover:border-emerald/25',
    iconActive: 'border-emerald/40 bg-emerald/15 text-emerald shadow-inner'
  }
};

export function OpponentSelector({
  options,
  value,
  onChange,
  selectedLabel,
  className
}: {
  options: OpponentSelectorOption[];
  value: OpponentKind;
  onChange: (id: OpponentKind) => void;
  selectedLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)} role="radiogroup">
      {options.map((option) => {
        const selected = value === option.id;
        const styles = accentStyles[option.id];
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'group relative flex flex-col gap-3 rounded-2xl border p-4 text-left',
              'bg-gradient-to-br from-surfaceElevated/90 to-surface/80 backdrop-blur-xl',
              'transition-[transform,box-shadow,border-color] duration-300',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              'active:scale-[0.99]',
              selected ? styles.active : styles.idle
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300',
                  selected ? styles.iconActive : styles.iconIdle
                )}
              >
                {option.icon ?? defaultIcons[option.id]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold tracking-tight text-ivory">{option.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{option.hint}</p>
              </div>
            </div>
            {selected && selectedLabel ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-200">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full animate-pulse-glow',
                    option.id === 'BOT' ? 'bg-emerald' : 'bg-gold'
                  )}
                  aria-hidden
                />
                {selectedLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
