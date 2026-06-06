import type { CosmeticDefinition, CosmeticSlot, SubscriptionTier } from '@duopoker/shared-types';
import {
  canEquipCosmetic,
  catalogPreviewUrl,
  subscriptionCosmeticsBySlot,
  tierLabel,
  tierMeetsRequirement
} from '@duopoker/shared-types';
import { useState, type ReactNode } from 'react';
import { Badge } from './Badge';
import { GlassPanel } from './GlassPanel';
import { SectionHeader } from './SectionHeader';
import { TabGroup } from './TabGroup';
import { cn } from '../cn';

export type CosmeticItem = {
  id: string;
  name: string;
  rarity: string;
  chipCost: number;
  imageUrl?: string;
  slot?: CosmeticSlot;
  requiredTier?: SubscriptionTier;
  description?: string;
};

const defaultSlotTabs: { id: CosmeticSlot; label: string }[] = [
  { id: 'deck', label: 'Card backs' },
  { id: 'chip', label: 'Chips' },
  { id: 'frame', label: 'Avatars' },
  { id: 'title', label: 'Titles' },
  { id: 'table', label: 'Table felt' }
];

const previewStage =
  'relative flex h-[7.25rem] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-b from-[#0c141c] to-[#030508]';

const feltSpotlight =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(13,61,40,0.45)_0%,rgba(3,5,8,0.15)_52%,transparent_72%)]';

function CosmeticPreview({ slot, itemId, imageUrl }: { slot: CosmeticSlot; itemId: string; imageUrl: string }) {
  const src = catalogPreviewUrl(itemId) ?? imageUrl;

  if (slot === 'deck') {
    return (
      <div className={previewStage}>
        <div className={feltSpotlight} />
        <img
          src={src}
          alt=""
          className="relative z-[1] h-[6.5rem] w-auto max-w-[88%] object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  if (slot === 'chip') {
    return (
      <div className={previewStage}>
        <div className={feltSpotlight} />
        <img
          src={src}
          alt=""
          className="relative z-[1] h-[5.5rem] w-[5.5rem] object-contain object-center drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)]"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  if (slot === 'frame') {
    return (
      <div className={previewStage}>
        <div className={feltSpotlight} />
        {itemId === 'frame_none' ? (
          <div className="relative z-[1] flex h-[5rem] w-[5rem] items-center justify-center rounded-full bg-gradient-to-br from-emerald/30 via-zinc-800 to-black ring-2 ring-white/25">
            <span className="font-display text-sm font-semibold text-ivory/90">DP</span>
          </div>
        ) : (
          <img
            src={src}
            alt=""
            className="relative z-[1] h-[5.5rem] w-[5.5rem] object-contain object-center drop-shadow-[0_0_14px_rgba(232,197,71,0.18)]"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    );
  }

  if (slot === 'title') {
    return (
      <div className={previewStage}>
        <div className={feltSpotlight} />
        <img
          src={src}
          alt=""
          className="relative z-[1] max-h-[4.5rem] w-[94%] object-contain object-center drop-shadow-[0_4px_14px_rgba(0,0,0,0.65)]"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={`${previewStage} bg-cover bg-center`}
      style={{
        backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 55%), url(${src})`
      }}
    />
  );
}

export function SkinSelector({
  catalog,
  subscriptionTier = 'FREE',
  inventory = [],
  equipped,
  eyebrow = 'Cosmetics',
  title = 'Table identity',
  description = 'Card backs, chips, and avatar frames — unlock higher tiers with subscriptions.',
  slotTabs = defaultSlotTabs,
  equipLabel = 'Equip',
  equippedLabel = 'Equipped',
  buyLabel = 'Buy',
  embedded = false,
  headerExtra,
  onBuy,
  onEquip
}: {
  catalog?: CosmeticItem[];
  subscriptionTier?: SubscriptionTier;
  inventory?: string[];
  equipped?: { deck?: string; chip?: string; frame?: string; title?: string; table?: string };
  eyebrow?: string;
  title?: string;
  description?: string;
  slotTabs?: { id: CosmeticSlot; label: string }[];
  equipLabel?: string;
  equippedLabel?: string;
  buyLabel?: string;
  embedded?: boolean;
  headerExtra?: ReactNode;
  onBuy?: (itemId: string) => void;
  onEquip?: (itemId: string) => void;
}) {
  const [slot, setSlot] = useState<CosmeticSlot>('deck');
  const tierItems = subscriptionCosmeticsBySlot(slot);
  const bonusItems = (catalog ?? []).filter((c) => c.slot === slot && (c.chipCost ?? 0) > 0);
  const items: CosmeticDefinition[] = [
    ...tierItems,
    ...bonusItems.map((b) => ({
      id: b.id,
      name: b.name,
      slot: b.slot ?? slot,
      requiredTier: (b.requiredTier ?? 'FREE') as SubscriptionTier,
      imageUrl: b.imageUrl ?? '',
      rarity: b.rarity as CosmeticDefinition['rarity'],
      chipCost: b.chipCost,
      description: b.description ?? ''
    }))
  ];

  const body = (
    <>
      {!embedded ? <SectionHeader eyebrow={eyebrow} title={title} description={description} /> : null}
      {headerExtra}
      <TabGroup tabs={slotTabs} value={slot} onChange={setSlot} className="mb-3" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const unlocked = canEquipCosmetic(item.id, subscriptionTier, inventory);
          const isEquipped =
            (slot === 'deck' && equipped?.deck === item.id) ||
            (slot === 'chip' && equipped?.chip === item.id) ||
            (slot === 'frame' && equipped?.frame === item.id) ||
            (slot === 'title' && equipped?.title === item.id) ||
            (slot === 'table' && equipped?.table === item.id);
          const needsTier = !tierMeetsRequirement(subscriptionTier, item.requiredTier);

          return (
            <div
              key={item.id}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl border text-center transition-all duration-200',
                isEquipped
                  ? 'border-gold/40 bg-gold/[0.08] shadow-glow-gold'
                  : unlocked
                    ? 'border-white/10 bg-black/35 hover:border-gold/25'
                    : 'border-white/5 bg-black/25 opacity-75'
              )}
            >
              {!unlocked ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                  <Badge variant={needsTier ? 'gold' : 'default'} className="text-[9px]">
                    {needsTier ? tierLabel[item.requiredTier] : `${item.chipCost?.toLocaleString()} chips`}
                  </Badge>
                </div>
              ) : null}

              <CosmeticPreview slot={slot} itemId={item.id} imageUrl={item.imageUrl} />

              <div className="flex flex-1 flex-col gap-1 px-2 pb-2.5 pt-2">
                <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-zinc-100">{item.name}</span>
                <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-gold/70">{item.rarity}</span>
                {unlocked && onEquip ? (
                  <button
                    type="button"
                    className={cn(
                      'mt-auto rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide transition-colors',
                      isEquipped
                        ? 'border-gold/40 bg-gold/20 text-gold-light'
                        : 'border-white/15 bg-white/5 text-muted hover:border-gold/30 hover:text-gold'
                    )}
                    onClick={() => onEquip(item.id)}
                  >
                    {isEquipped ? equippedLabel : equipLabel}
                  </button>
                ) : null}
                {!unlocked && item.chipCost && onBuy ? (
                  <button
                    type="button"
                    className="mt-auto rounded-md border border-emerald/30 bg-emerald/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald hover:bg-emerald/20"
                    onClick={() => onBuy(item.id)}
                  >
                    {buyLabel}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (embedded) return <div className="min-w-0">{body}</div>;

  return (
    <GlassPanel interactive glow="gold" className="p-5 sm:p-6">
      {body}
    </GlassPanel>
  );
}
