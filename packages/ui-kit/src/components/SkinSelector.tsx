import type { CosmeticDefinition, CosmeticSlot, SubscriptionTier } from '@duopoker/shared-types';
import {
  canEquipCosmetic,
  cosmeticImageUrl,
  subscriptionCosmeticsBySlot,
  tierLabel,
  tierMeetsRequirement
} from '@duopoker/shared-types';
import { useState } from 'react';
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
  { id: 'title', label: 'Titles' }
];

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
  onBuy,
  onEquip
}: {
  catalog?: CosmeticItem[];
  subscriptionTier?: SubscriptionTier;
  inventory?: string[];
  equipped?: { deck?: string; chip?: string; frame?: string; title?: string };
  eyebrow?: string;
  title?: string;
  description?: string;
  slotTabs?: { id: CosmeticSlot; label: string }[];
  equipLabel?: string;
  equippedLabel?: string;
  buyLabel?: string;
  onBuy?: (itemId: string) => void;
  onEquip?: (itemId: string) => void;
}) {
  const [slot, setSlot] = useState<CosmeticSlot>('deck');
  const tierItems = subscriptionCosmeticsBySlot(slot);
  const bonusItems = (catalog ?? []).filter((c) => c.slot === slot && (c.chipCost ?? 0) > 0);
  const items: CosmeticDefinition[] = [...tierItems, ...bonusItems.map((b) => ({
    id: b.id,
    name: b.name,
    slot: b.slot ?? slot,
    requiredTier: (b.requiredTier ?? 'FREE') as SubscriptionTier,
    imageUrl: b.imageUrl ?? '',
    rarity: b.rarity as CosmeticDefinition['rarity'],
    chipCost: b.chipCost,
    description: b.description ?? ''
  }))];

  return (
    <GlassPanel interactive glow="gold" className="p-5 sm:p-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <TabGroup tabs={slotTabs} value={slot} onChange={setSlot} className="mb-4" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const unlocked = canEquipCosmetic(item.id, subscriptionTier, inventory);
          const isEquipped =
            (slot === 'deck' && equipped?.deck === item.id) ||
            (slot === 'chip' && equipped?.chip === item.id) ||
            (slot === 'frame' && equipped?.frame === item.id) ||
            (slot === 'title' && equipped?.title === item.id);
          const needsTier = !tierMeetsRequirement(subscriptionTier, item.requiredTier);
          return (
            <div
              key={item.id}
              className={cn(
                'group relative flex flex-col items-center overflow-hidden rounded-2xl border px-2 py-3 text-center transition-all duration-300',
                isEquipped
                  ? 'border-gold/40 bg-gold/10 shadow-glow-gold'
                  : unlocked
                    ? 'border-white/10 bg-black/30 hover:border-gold/25 hover:shadow-glow-gold'
                    : 'border-white/5 bg-black/20 opacity-70'
              )}
            >
              {!unlocked ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
                  <Badge variant={needsTier ? 'gold' : 'default'} className="text-[9px]">
                    {needsTier ? tierLabel[item.requiredTier] : `${item.chipCost?.toLocaleString()} chips`}
                  </Badge>
                </div>
              ) : null}
              <div
                className={cn(
                  'mb-2 flex w-full items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-[1.03]',
                  slot === 'deck'
                    ? 'h-[5.5rem] bg-black/40'
                    : slot === 'title'
                      ? 'h-12 bg-[radial-gradient(ellipse_at_center,#0a1f14_0%,#030508_100%)]'
                      : 'h-[5.5rem] bg-[radial-gradient(ellipse_at_center,#0d3d28_0%,#030508_100%)]'
                )}
                style={
                  slot !== 'deck'
                    ? {
                        backgroundImage:
                          'radial-gradient(ellipse at center, rgba(13,61,40,0.9) 0%, rgba(3,5,8,0.95) 100%), url(/assets/table-felt.png)',
                        backgroundSize: 'cover, 96px 96px'
                      }
                    : undefined
                }
              >
                <img
                  src={cosmeticImageUrl(item.id) ?? item.imageUrl}
                  alt=""
                  className={cn(
                    'object-contain',
                    slot === 'deck' ? 'h-20 w-14' : slot === 'title' ? 'h-9 w-36 max-w-full' : 'h-16 w-16'
                  )}
                  loading="lazy"
                />
              </div>
              <span className="text-xs font-semibold text-zinc-100">{item.name}</span>
              <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-gold/75">
                {item.rarity}
              </span>
              {unlocked && onEquip ? (
                <button
                  type="button"
                  className={cn(
                    'mt-2 rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors',
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
                  className="mt-2 rounded-lg border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald hover:bg-emerald/20"
                  onClick={() => onBuy(item.id)}
                >
                  {buyLabel}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
