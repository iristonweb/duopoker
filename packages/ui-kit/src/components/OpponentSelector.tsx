import type { ReactNode } from 'react';
import { cn } from '../cn';
import { DpClubMark } from './DpClubMark';

export type OpponentKind = 'HUMAN' | 'BOT';

export interface OpponentSelectorOption {
  id: OpponentKind;
  label: string;
  hint: string;
  icon?: ReactNode;
}

const defaultIcons: Record<OpponentKind, ReactNode> = {
  HUMAN: (
    <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
      <circle cx="16" cy="11" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 8a4 4 0 0 1 0 8M28 14a6 6 0 0 0-4-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  BOT: (
    <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden>
      <rect x="7" y="10" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13" cy="17" r="1.5" fill="currentColor" />
      <circle cx="19" cy="17" r="1.5" fill="currentColor" />
      <path d="M13 21h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 6v3M11 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 16H7M25 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
};

const accentStyles: Record<
  OpponentKind,
  {
    idle: string;
    active: string;
    iconIdle: string;
    iconActive: string;
    chip: string;
    glow: string;
    banner: string;
  }
> = {
  HUMAN: {
    idle: 'border-white/10 hover:border-gold/40 hover:shadow-glow-gold',
    active:
      'border-gold/55 bg-gradient-to-br from-gold/[0.2] via-[#1a1408]/80 to-black/40 shadow-glow-gold ring-1 ring-gold/35',
    iconIdle: 'border-white/10 bg-black/30 text-zinc-300 group-hover:border-gold/35',
    iconActive: 'border-gold/50 bg-gradient-to-br from-gold/30 to-gold/5 text-gold-light shadow-inner-gold',
    chip: 'border-gold/35 bg-gold/12 text-gold-light',
    glow: 'radial-gradient(circle, rgba(232,197,71,0.28), transparent 68%)',
    banner: 'from-gold/25 via-gold/5 to-transparent'
  },
  BOT: {
    idle: 'border-white/10 hover:border-emerald/45 hover:shadow-glow-emerald',
    active:
      'border-emerald/55 bg-gradient-to-br from-emerald/[0.18] via-[#081a10]/80 to-black/40 shadow-glow-emerald ring-1 ring-emerald/35',
    iconIdle: 'border-white/10 bg-black/30 text-zinc-300 group-hover:border-emerald/35',
    iconActive: 'border-emerald/50 bg-gradient-to-br from-emerald/30 to-emerald/5 text-emerald shadow-inner',
    chip: 'border-emerald/35 bg-emerald/12 text-emerald',
    glow: 'radial-gradient(circle, rgba(74,222,128,0.28), transparent 68%)',
    banner: 'from-emerald/25 via-emerald/5 to-transparent'
  }
};

export function OpponentSelector({
  options,
  value,
  onChange,
  selectedLabel,
  className,
  showBrand = true
}: {
  options: OpponentSelectorOption[];
  value: OpponentKind;
  onChange: (id: OpponentKind) => void;
  selectedLabel?: string;
  className?: string;
  showBrand?: boolean;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showBrand ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-black/50 via-black/30 to-black/50 px-3 py-2.5">
          <DpClubMark size="sm" variant={value === 'BOT' ? 'emerald' : 'gold'} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-subtle">
            Premium matchmaking
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
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
                'group relative flex min-h-[132px] flex-col overflow-hidden rounded-2xl border text-left',
                'transition-[transform,box-shadow,border-color,background] duration-300',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                'active:scale-[0.985]',
                selected ? styles.active : styles.idle
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b opacity-80',
                  styles.banner
                )}
                aria-hidden
              />
              {selected ? (
                <span
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl"
                  style={{ background: styles.glow }}
                  aria-hidden
                />
              ) : null}

              <div className="relative flex flex-1 flex-col justify-between p-4 pt-5">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg transition-colors duration-300',
                      selected ? styles.iconActive : styles.iconIdle
                    )}
                  >
                    {option.icon ?? defaultIcons[option.id]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold tracking-tight text-ivory">{option.label}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted">{option.hint}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-2">
                  {selected && selectedLabel ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                        styles.chip
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full animate-pulse-glow',
                          option.id === 'BOT' ? 'bg-emerald' : 'bg-gold'
                        )}
                        aria-hidden
                      />
                      {selectedLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-subtle">Select</span>
                  )}
                  <DpClubMark size="xs" variant={option.id === 'BOT' ? 'emerald' : 'gold'} className="opacity-70" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
