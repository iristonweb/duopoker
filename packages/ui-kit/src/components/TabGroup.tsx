import { cn } from '../cn';

export function TabGroup<T extends string>({
  tabs,
  value,
  onChange,
  className
}: {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex w-full rounded-xl border border-white/10 bg-black/30 p-1 shadow-inner',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200',
              active
                ? 'bg-gradient-to-b from-gold/25 to-gold/10 text-gold-light shadow-inner-gold'
                : 'text-muted hover:text-zinc-200'
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
