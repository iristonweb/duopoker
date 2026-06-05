import { GlassPanel } from './GlassPanel';

export type CosmeticItem = {
  id: string;
  name: string;
  rarity: string;
  chipCost: number;
  imageUrl?: string;
};

export function SkinSelector({
  catalog,
  onBuy
}: {
  catalog?: CosmeticItem[];
  onBuy?: (itemId: string) => void;
}) {
  const items =
    catalog && catalog.length
      ? catalog
      : [
          { id: 'deck', name: 'Deck', rarity: '—', chipCost: 0, imageUrl: '/assets/cosmetics/deck_neon.svg' },
          { id: 'table', name: 'Table', rarity: '—', chipCost: 0, imageUrl: '/assets/cosmetics/table_void.svg' },
          { id: 'frame', name: 'Frame', rarity: '—', chipCost: 0, imageUrl: '/assets/cosmetics/frame_gold.svg' }
        ];
  return (
    <GlassPanel interactive>
      <strong className="font-semibold text-zinc-100">Cosmetic shop</strong>
      <p className="mt-1 text-sm text-muted">Buy with virtual chips (API catalog when backend is up).</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] px-1 text-center text-xs text-subtle"
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="mb-2 h-16 w-16 object-contain"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="mb-2 h-16 w-16 rounded-lg border border-dashed border-white/15 bg-black/20" />
            )}
            <span className="font-medium text-zinc-200">{item.name}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-gold/70">{item.rarity}</span>
            {item.chipCost > 0 ? <span className="mt-1 text-emerald/90">{item.chipCost} chips</span> : null}
            {onBuy && item.chipCost > 0 ? (
              <button
                type="button"
                className="mt-2 rounded-lg border border-gold/30 px-2 py-1 text-[10px] text-gold hover:bg-gold/10"
                onClick={() => onBuy(item.id)}
              >
                Buy
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
