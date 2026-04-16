import { GlassPanel } from './GlassPanel';

export function SkinSelector() {
  return (
    <GlassPanel interactive>
      <strong className="font-semibold text-zinc-100">Skin showcase</strong>
      <p className="mt-1 text-sm text-muted">Deck, table & frame previews rotate in real time</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {['Deck', 'Table', 'Frame'].map((label) => (
          <div
            key={label}
            className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-xs text-subtle"
          >
            {label}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
