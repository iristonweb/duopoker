export type SubscriptionTier = 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';
export type CosmeticSlot = 'deck' | 'chip' | 'frame';

export const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
  ROYAL: 4
};

export type CosmeticDefinition = {
  id: string;
  name: string;
  slot: CosmeticSlot;
  requiredTier: SubscriptionTier;
  imageUrl: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  chipCost?: number;
  description: string;
};

const asset = (path: string) => `/assets/cosmetics/${path}`;

/** Subscription-tier cosmetics — higher tier = richer visuals */
export const subscriptionCosmetics: CosmeticDefinition[] = [
  {
    id: 'deck_classic',
    name: 'Midnight Classic',
    slot: 'deck',
    requiredTier: 'FREE',
    imageUrl: asset('backs/deck_classic.svg'),
    rarity: 'COMMON',
    description: 'Deep midnight felt with a subtle spade motif.'
  },
  {
    id: 'deck_silver',
    name: 'Silver Filigree',
    slot: 'deck',
    requiredTier: 'SILVER',
    imageUrl: asset('backs/deck_silver.svg'),
    rarity: 'RARE',
    description: 'Art-deco silver lattice with cool metallic sheen.'
  },
  {
    id: 'deck_gold',
    name: 'Champagne Gold',
    slot: 'deck',
    requiredTier: 'GOLD',
    imageUrl: asset('backs/deck_gold.svg'),
    rarity: 'EPIC',
    description: 'Ornate gold border and damask center — signature DuoPoker luxury.'
  },
  {
    id: 'deck_platinum',
    name: 'Platinum Prism',
    slot: 'deck',
    requiredTier: 'PLATINUM',
    imageUrl: asset('backs/deck_platinum.svg'),
    rarity: 'EPIC',
    description: 'Violet holographic geometry with prismatic highlights.'
  },
  {
    id: 'deck_royal',
    name: 'Royal Crest',
    slot: 'deck',
    requiredTier: 'ROYAL',
    imageUrl: asset('backs/deck_royal.svg'),
    rarity: 'LEGENDARY',
    description: 'Crown crest, rose-gold filigree — the ultimate table statement.'
  },
  {
    id: 'chip_classic',
    name: 'House Chips',
    slot: 'chip',
    requiredTier: 'FREE',
    imageUrl: asset('chips/chip_classic.svg'),
    rarity: 'COMMON',
    description: 'Clean emerald edge stripes on midnight clay.'
  },
  {
    id: 'chip_silver',
    name: 'Sterling Stack',
    slot: 'chip',
    requiredTier: 'SILVER',
    imageUrl: asset('chips/chip_silver.svg'),
    rarity: 'RARE',
    description: 'Polished silver inlay with diamond edge spots.'
  },
  {
    id: 'chip_gold',
    name: 'Champagne Stack',
    slot: 'chip',
    requiredTier: 'GOLD',
    imageUrl: asset('chips/chip_gold.svg'),
    rarity: 'EPIC',
    description: 'Heavy gold rim and embossed center seal.'
  },
  {
    id: 'chip_platinum',
    name: 'Prism Stack',
    slot: 'chip',
    requiredTier: 'PLATINUM',
    imageUrl: asset('chips/chip_platinum.svg'),
    rarity: 'EPIC',
    description: 'Iridescent violet core with platinum edge band.'
  },
  {
    id: 'chip_royal',
    name: 'Crown Stack',
    slot: 'chip',
    requiredTier: 'ROYAL',
    imageUrl: asset('chips/chip_royal.svg'),
    rarity: 'LEGENDARY',
    description: 'Rose-gold crown emblem — reserved for Royal members.'
  },
  {
    id: 'frame_none',
    name: 'Minimal',
    slot: 'frame',
    requiredTier: 'FREE',
    imageUrl: asset('frames/frame_none.svg'),
    rarity: 'COMMON',
    description: 'Soft ring — clean and understated.'
  },
  {
    id: 'frame_silver',
    name: 'Silver Halo',
    slot: 'frame',
    requiredTier: 'SILVER',
    imageUrl: asset('frames/frame_silver.svg'),
    rarity: 'RARE',
    description: 'Cool silver glow around your avatar.'
  },
  {
    id: 'frame_gold',
    name: 'Gold Aureole',
    slot: 'frame',
    requiredTier: 'GOLD',
    imageUrl: asset('frames/frame_gold.svg'),
    rarity: 'EPIC',
    description: 'Radiant gold ring with subtle pulse.'
  },
  {
    id: 'frame_platinum',
    name: 'Platinum Aura',
    slot: 'frame',
    requiredTier: 'PLATINUM',
    imageUrl: asset('frames/frame_platinum.svg'),
    rarity: 'EPIC',
    description: 'Violet-platinum double ring with shimmer.'
  },
  {
    id: 'frame_royal',
    name: 'Royal Regalia',
    slot: 'frame',
    requiredTier: 'ROYAL',
    imageUrl: asset('frames/frame_royal.svg'),
    rarity: 'LEGENDARY',
    description: 'Crown-tipped frame with animated gold glow.'
  }
];

/** Extra chip-shop exclusives (stack on top of subscription tier) */
export const bonusCosmetics: CosmeticDefinition[] = [
  {
    id: 'deck_neon',
    name: 'Neon Pulse',
    slot: 'deck',
    requiredTier: 'FREE',
    imageUrl: '/assets/cosmetics/deck_neon.svg',
    rarity: 'RARE',
    chipCost: 1800,
    description: 'Electric emerald circuit pattern — chip shop exclusive.'
  },
  {
    id: 'table_void',
    name: 'Void Felt',
    slot: 'chip',
    requiredTier: 'FREE',
    imageUrl: '/assets/cosmetics/table_void.svg',
    rarity: 'EPIC',
    chipCost: 4500,
    description: 'Abyssal table felt preview token.'
  }
];

export const allCosmetics: CosmeticDefinition[] = [...subscriptionCosmetics, ...bonusCosmetics];

export const cosmeticById = (id: string): CosmeticDefinition | undefined =>
  allCosmetics.find((c) => c.id === id);

export const cosmeticsBySlot = (slot: CosmeticSlot): CosmeticDefinition[] =>
  allCosmetics.filter((c) => c.slot === slot);

export const subscriptionCosmeticsBySlot = (slot: CosmeticSlot): CosmeticDefinition[] =>
  subscriptionCosmetics
    .filter((c) => c.slot === slot)
    .sort((a, b) => TIER_RANK[a.requiredTier] - TIER_RANK[b.requiredTier]);

export const defaultCosmeticForSlot = (slot: CosmeticSlot): CosmeticDefinition =>
  subscriptionCosmetics.find((c) => c.slot === slot && c.requiredTier === 'FREE')!;

export const tierMeetsRequirement = (userTier: SubscriptionTier, required: SubscriptionTier): boolean =>
  TIER_RANK[userTier] >= TIER_RANK[required];

export const bestCosmeticForTier = (slot: CosmeticSlot, tier: SubscriptionTier): CosmeticDefinition => {
  const eligible = subscriptionCosmetics
    .filter((c) => c.slot === slot && tierMeetsRequirement(tier, c.requiredTier))
    .sort((a, b) => TIER_RANK[b.requiredTier] - TIER_RANK[a.requiredTier]);
  return eligible[0] ?? defaultCosmeticForSlot(slot);
};

export type EquippedCosmetics = {
  deck: string;
  chip: string;
  frame: string;
};

export const defaultEquipped = (): EquippedCosmetics => ({
  deck: 'deck_classic',
  chip: 'chip_classic',
  frame: 'frame_none'
});

export const resolveEquipped = (
  equipped: Partial<EquippedCosmetics> | undefined,
  tier: SubscriptionTier,
  inventory: string[] = []
): EquippedCosmetics => {
  const pick = (slot: CosmeticSlot, id?: string): string => {
    const def = id ? cosmeticById(id) : undefined;
    if (def?.slot === slot) {
      const tierOk = tierMeetsRequirement(tier, def.requiredTier);
      const owned = !def.chipCost || inventory.includes(def.id);
      if (tierOk && owned) return def.id;
    }
    return bestCosmeticForTier(slot, tier).id;
  };
  return {
    deck: pick('deck', equipped?.deck),
    chip: pick('chip', equipped?.chip),
    frame: pick('frame', equipped?.frame)
  };
};

export const canEquipCosmetic = (
  itemId: string,
  tier: SubscriptionTier,
  inventory: string[]
): boolean => {
  const def = cosmeticById(itemId);
  if (!def) return false;
  if (def.chipCost && !inventory.includes(itemId)) return false;
  return tierMeetsRequirement(tier, def.requiredTier);
};

export const tierLabel: Record<SubscriptionTier, string> = {
  FREE: 'Free',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  ROYAL: 'Royal'
};
