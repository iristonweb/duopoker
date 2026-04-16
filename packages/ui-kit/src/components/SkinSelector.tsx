import { GlassPanel } from './GlassPanel';

export type CosmeticItem = { id: string; name: string; rarity: string; chipCost: number };

export function SkinSelector({ catalog }: { catalog?: CosmeticItem[] }) {
  const items =
    catalog && catalog.length
      ? catalog
      : [
          { id: 'deck', name: 'Deck', rarity: '—', chipCost: 0 },
          { id: 'table', name: 'Table', rarity: '—', chipCost: 0 },
          { id: 'frame', name: 'Frame', rarity: '—', chipCost: 0 }
        ];
  return (
    <GlassPanel interactive>
      <strong className="font-semibold text-zinc-100">Cosmetic shop</strong>
      <p className="mt-1 text-sm text-muted">Buy with virtual chips (API catalog when backend is up).</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-1 text-center text-xs text-subtle"
          >
            <span className="font-medium text-zinc-200">{item.name}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-gold/70">{item.rarity}</span>
            {item.chipCost > 0 ? <span className="mt-1 text-emerald/90">{item.chipCost} chips</span> : null}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
