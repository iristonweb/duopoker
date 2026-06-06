import { cn } from '../cn';

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
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtle">{label}</p>
          <span className="rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald">
            {value}
          </span>
        </div>
      ) : null}
      <div
        className="inline-flex w-full rounded-xl border border-white/10 bg-black/30 p-1 shadow-inner"
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
                'flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold tabular-nums transition-all duration-200',
                active
                  ? 'bg-gradient-to-b from-emerald/30 to-emerald/10 text-emerald shadow-inner'
                  : 'text-muted hover:text-zinc-200'
              )}
            >
              {count}
            </button>
          );
        })}
      </div>
      {hint ? <p className="text-xs leading-relaxed text-subtle">{hint}</p> : null}
    </div>
  );
}
