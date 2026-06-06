export type SubscriptionTier =
  | 'FREE'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'BLACK';

export type CosmeticSlot = 'deck' | 'chip' | 'frame' | 'title' | 'table';

export const TIER_RANK: Record<SubscriptionTier, number> = {
  FREE: 0,
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
  BLACK: 6
};

export type CosmeticDefinition = {
  id: string;
  name: string;
  slot: CosmeticSlot;
  requiredTier: SubscriptionTier;
  /** Catalog / subscription matrix preview */
  imageUrl: string;
  /** In-game asset — transparent cutout for chips, frames, titles */
  gameImageUrl?: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  chipCost?: number;
  description: string;
};

const asset = (path: string) => `/assets/cosmetics/${path}`;

const paidTiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'BLACK'] as const;

const tierDeckMeta: Record<
  (typeof paidTiers)[number],
  { name: string; rarity: CosmeticDefinition['rarity']; description: string }
> = {
  BRONZE: {
    name: 'Bronze Filigree',
    rarity: 'RARE',
    description: 'DP CLUB bronze lattice with warm copper filigree on dark brown.'
  },
  SILVER: {
    name: 'Silver Filigree',
    rarity: 'RARE',
    description: 'DP CLUB sterling lattice with cool metallic sheen.'
  },
  GOLD: {
    name: 'Champagne Gold',
    rarity: 'EPIC',
    description: 'DP CLUB champagne gold damask — signature luxury.'
  },
  PLATINUM: {
    name: 'Platinum Prism',
    rarity: 'EPIC',
    description: 'DP CLUB prismatic platinum holographic geometry.'
  },
  DIAMOND: {
    name: 'Diamond Radiance',
    rarity: 'EPIC',
    description: 'DP CLUB cyan diamond geometry with luminous glow.'
  },
  BLACK: {
    name: 'Black Regalia',
    rarity: 'LEGENDARY',
    description: 'DP CLUB black-and-gold crest — reserved for Black members.'
  }
};

const tierChipMeta: Record<
  (typeof paidTiers)[number],
  { name: string; rarity: CosmeticDefinition['rarity']; description: string }
> = {
  BRONZE: {
    name: 'Bronze Stack',
    rarity: 'RARE',
    description: 'Copper-rimmed chips with embossed DP CLUB seal.'
  },
  SILVER: {
    name: 'Sterling Stack',
    rarity: 'RARE',
    description: 'Polished silver inlay with diamond edge spots.'
  },
  GOLD: {
    name: 'Champagne Stack',
    rarity: 'EPIC',
    description: 'Heavy gold rim and embossed center seal.'
  },
  PLATINUM: {
    name: 'Prism Stack',
    rarity: 'EPIC',
    description: 'Iridescent platinum core with glowing gem accents.'
  },
  DIAMOND: {
    name: 'Diamond Stack',
    rarity: 'EPIC',
    description: 'Cyan-glowing edges with diamond-shaped inserts.'
  },
  BLACK: {
    name: 'Crown Stack',
    rarity: 'LEGENDARY',
    description: 'Sleek black chips with gold DP CLUB crown emblem.'
  }
};

const tierFrameMeta: Record<
  (typeof paidTiers)[number],
  { name: string; rarity: CosmeticDefinition['rarity']; description: string }
> = {
  BRONZE: {
    name: 'Bronze Halo',
    rarity: 'RARE',
    description: 'Warm bronze ring with a small diamond accent.'
  },
  SILVER: {
    name: 'Silver Halo',
    rarity: 'RARE',
    description: 'Cool silver glow around your avatar.'
  },
  GOLD: {
    name: 'Gold Aureole',
    rarity: 'EPIC',
    description: 'Radiant gold ring topped with a subtle crown.'
  },
  PLATINUM: {
    name: 'Platinum Aura',
    rarity: 'EPIC',
    description: 'Platinum double ring with light-blue gem accents.'
  },
  DIAMOND: {
    name: 'Diamond Aura',
    rarity: 'EPIC',
    description: 'Glowing cyan frame with prominent diamond gems.'
  },
  BLACK: {
    name: 'Black Regalia',
    rarity: 'LEGENDARY',
    description: 'Ornate gold crown frame with mist effects.'
  }
};

const tierTitleMeta: Record<
  (typeof paidTiers)[number],
  { name: string; label: string; rarity: CosmeticDefinition['rarity']; description: string }
> = {
  BRONZE: {
    name: 'Bronze Player',
    label: 'DP CLUB BRONZE PLAYER',
    rarity: 'RARE',
    description: 'Bronze-bordered title badge for club members.'
  },
  SILVER: {
    name: 'Silver Player',
    label: 'DP CLUB SILVER PLAYER',
    rarity: 'RARE',
    description: 'Silver-bordered title badge.'
  },
  GOLD: {
    name: 'Gold Legend',
    label: 'DP CLUB GOLD LEGEND',
    rarity: 'EPIC',
    description: 'Gold title badge topped with a crown.'
  },
  PLATINUM: {
    name: 'Platinum Elite',
    label: 'DP CLUB PLATINUM ELITE',
    rarity: 'EPIC',
    description: 'Platinum title badge with a faceted gem.'
  },
  DIAMOND: {
    name: 'Diamond Master',
    label: 'DP CLUB DIAMOND MASTER',
    rarity: 'EPIC',
    description: 'Brilliant cyan diamond title badge.'
  },
  BLACK: {
    name: 'Black King',
    label: 'DP CLUB BLACK KING',
    rarity: 'LEGENDARY',
    description: 'Ultimate black-and-gold crown title badge.'
  }
};

const tierCosmetics = (tier: (typeof paidTiers)[number]): CosmeticDefinition[] => {
  const t = tier.toLowerCase();
  const deck = tierDeckMeta[tier];
  const chip = tierChipMeta[tier];
  const frame = tierFrameMeta[tier];
  const title = tierTitleMeta[tier];
  return [
    {
      id: `deck_${t}`,
      name: deck.name,
      slot: 'deck',
      requiredTier: tier,
      imageUrl: asset(`backs/deck_${t}.png`),
      gameImageUrl: asset(`backs/deck_${t}_game.png`),
      rarity: deck.rarity,
      description: deck.description
    },
    {
      id: `chip_${t}`,
      name: chip.name,
      slot: 'chip',
      requiredTier: tier,
      imageUrl: asset(`chips/chip_${t}.png`),
      gameImageUrl: asset(`chips/chip_${t}_game.png`),
      rarity: chip.rarity,
      description: chip.description
    },
    {
      id: `frame_${t}`,
      name: frame.name,
      slot: 'frame',
      requiredTier: tier,
      imageUrl: asset(`frames/frame_${t}.png`),
      gameImageUrl: asset(`frames/frame_${t}_game.png`),
      rarity: frame.rarity,
      description: frame.description
    },
    {
      id: `title_${t}`,
      name: title.name,
      slot: 'title',
      requiredTier: tier,
      imageUrl: asset(`titles/title_${t}.png`),
      gameImageUrl: asset(`titles/title_${t}_game.png`),
      rarity: title.rarity,
      description: title.description
    }
  ];
};

/** Subscription-tier cosmetics — higher tier = richer visuals */
export const subscriptionCosmetics: CosmeticDefinition[] = [
  {
    id: 'deck_classic',
    name: 'DP CLUB Classic',
    slot: 'deck',
    requiredTier: 'FREE',
    imageUrl: asset('backs/deck_classic.png'),
    gameImageUrl: asset('backs/deck_classic_game.png'),
    rarity: 'COMMON',
    description: 'Signature DP CLUB midnight deck with gold filigree.'
  },
  {
    id: 'chip_classic',
    name: 'DP CLUB House',
    slot: 'chip',
    requiredTier: 'FREE',
    imageUrl: asset('chips/chip_classic.png'),
    gameImageUrl: asset('chips/chip_classic_game.png'),
    rarity: 'COMMON',
    description: 'Official DP CLUB house chips — emerald edge stripes.'
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
    id: 'table_classic',
    name: 'Classic Felt',
    slot: 'table',
    requiredTier: 'FREE',
    imageUrl: '/assets/table-felt.png',
    gameImageUrl: '/assets/table-felt.png',
    rarity: 'COMMON',
    description: 'Signature DP CLUB emerald felt.'
  },
  ...paidTiers.flatMap(tierCosmetics)
];

/** Extra chip-shop exclusives (stack on top of subscription tier) */
export const bonusCosmetics: CosmeticDefinition[] = [
  {
    id: 'deck_neon',
    name: 'Neon Pulse',
    slot: 'deck',
    requiredTier: 'FREE',
    imageUrl: asset('backs/deck_neon.png'),
    gameImageUrl: asset('backs/deck_neon_game.png'),
    rarity: 'RARE',
    chipCost: 1800,
    description: 'Electric emerald circuit pattern — chip shop exclusive.'
  },
  {
    id: 'table_void',
    name: 'Void Felt',
    slot: 'table',
    requiredTier: 'FREE',
    imageUrl: asset('table_void.png'),
    gameImageUrl: asset('table_void_game.png'),
    rarity: 'EPIC',
    chipCost: 4500,
    description: 'Abyssal void felt — chip shop exclusive.'
  }
];

export const allCosmetics: CosmeticDefinition[] = [...subscriptionCosmetics, ...bonusCosmetics];

export const cosmeticById = (id: string): CosmeticDefinition | undefined =>
  allCosmetics.find((c) => c.id === id);

/** Profile / shop catalog preview — rich still assets, not in-game cutouts. */
export const catalogPreviewUrl = (id: string): string | undefined => {
  const def = cosmeticById(id);
  if (!def) return undefined;
  return def.imageUrl;
};

/** Prefer transparent game cutout when available (table, HUD, live preview). */
export const cosmeticImageUrl = (
  id: string,
  preferGame = true
): string | undefined => {
  const def = cosmeticById(id);
  if (!def) return undefined;
  if (preferGame && def.gameImageUrl) return def.gameImageUrl;
  return def.imageUrl;
};

export const cosmeticsBySlot = (slot: CosmeticSlot): CosmeticDefinition[] =>
  allCosmetics.filter((c) => c.slot === slot);

export const subscriptionCosmeticsBySlot = (slot: CosmeticSlot): CosmeticDefinition[] =>
  subscriptionCosmetics
    .filter((c) => c.slot === slot)
    .sort((a, b) => TIER_RANK[a.requiredTier] - TIER_RANK[b.requiredTier]);

export const defaultCosmeticForSlot = (slot: CosmeticSlot): CosmeticDefinition | undefined => {
  if (slot === 'title') return undefined;
  return subscriptionCosmetics.find((c) => c.slot === slot && c.requiredTier === 'FREE');
};

export const tierMeetsRequirement = (userTier: SubscriptionTier, required: SubscriptionTier): boolean =>
  TIER_RANK[userTier] >= TIER_RANK[required];

export const bestCosmeticForTier = (slot: CosmeticSlot, tier: SubscriptionTier): CosmeticDefinition | undefined => {
  const eligible = subscriptionCosmetics
    .filter((c) => c.slot === slot && tierMeetsRequirement(tier, c.requiredTier))
    .sort((a, b) => TIER_RANK[b.requiredTier] - TIER_RANK[a.requiredTier]);
  return eligible[0];
};

export type EquippedCosmetics = {
  deck: string;
  chip: string;
  frame: string;
  title: string;
  table: string;
};

export const defaultEquipped = (): EquippedCosmetics => ({
  deck: 'deck_classic',
  chip: 'chip_classic',
  frame: 'frame_none',
  title: '',
  table: 'table_classic'
});

  /** Maps deck id → CSS shimmer class for in-game card backs. */
export const deckBackEffectClass = (deckId: string): string | undefined => {
  const effects: Record<string, string> = {
    deck_classic: 'card-back-classic',
    deck_bronze: 'card-back-bronze',
    deck_silver: 'card-back-silver',
    deck_gold: 'card-back-gold',
    deck_platinum: 'card-back-platinum',
    deck_diamond: 'card-back-diamond',
    deck_black: 'card-back-black',
    deck_neon: 'card-back-neon'
  };
  return effects[deckId];
};

/** Chip slot id safe for chip stack / pot visuals (excludes table felts). */
export const gameChipId = (chipId: string): string =>
  chipId.startsWith('table_') ? 'chip_classic' : chipId;

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
    if (slot === 'title') return '';
    return bestCosmeticForTier(slot, tier)?.id ?? defaultEquipped()[slot];
  };
  const chipId = equipped?.chip === 'table_void' ? undefined : equipped?.chip;
  const tableId =
    equipped?.table ?? (equipped?.chip === 'table_void' ? 'table_void' : undefined);

  return {
    deck: pick('deck', equipped?.deck),
    chip: pick('chip', chipId),
    frame: pick('frame', equipped?.frame),
    title: pick('title', equipped?.title),
    table: pick('table', tableId)
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
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond',
  BLACK: 'Black'
};

export const titleBadgeLabel = (titleId: string): string | undefined => {
  const tier = titleId.replace('title_', '').toUpperCase() as (typeof paidTiers)[number];
  return tierTitleMeta[tier]?.label;
};
