import { cn } from '../cn';
import { DpClubMark } from './DpClubMark';

export function PlayerCountSelector({
  value,
  onChange,
  min = 2,
  max = 6,
  label,
  hint,
  className
}: {
  value: number;
  onChange: (count: number) => void;
  min?: number;
  max?: number;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-gradient-to-b from-black/40 to-black/20 p-3.5 shadow-inner',
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          {label ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald/80">{label}</p>
          ) : null}
          {hint ? <p className="mt-1 text-xs leading-relaxed text-subtle">{hint}</p> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <DpClubMark size="xs" variant="emerald" />
          <span className="rounded-full border border-emerald/35 bg-emerald/10 px-3 py-1 font-mono text-sm font-bold tabular-nums text-emerald">
            {value}
          </span>
        </div>
      </div>

      <div
        className="grid grid-cols-5 gap-1.5 rounded-xl border border-white/10 bg-black/35 p-1.5"
        role="radiogroup"
        aria-label={label}
      >
        {options.map((count) => {
          const active = value === count;
          return (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(count)}
              className={cn(
                'relative rounded-lg px-1 py-2 text-sm font-semibold tabular-nums transition-all duration-200',
                active
                  ? 'bg-gradient-to-b from-emerald/35 to-emerald/10 text-emerald shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(74,222,128,0.2)] ring-1 ring-emerald/40'
                  : 'text-muted hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              {count}
              {active ? (
                <span className="absolute inset-x-2 bottom-1 h-0.5 rounded-full bg-emerald/60" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
