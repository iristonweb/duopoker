import {
  cosmeticById,
  cosmeticImageUrl,
  defaultEquipped,
  resolveEquipped,
  titleBadgeLabel,
  type EquippedCosmetics,
  type SubscriptionTier
} from '@duopoker/shared-types';

const LS_EQUIPPED = 'duopoker_equipped_v4';

export const readEquipped = (userId: string): Partial<EquippedCosmetics> => {
  try {
    const raw = localStorage.getItem(`${LS_EQUIPPED}:${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<EquippedCosmetics>;
    return { ...defaultEquipped(), ...parsed };
  } catch {
    return {};
  }
};

export const equippedFromInventory = (
  inventory: Array<{ itemId: string; equipped?: boolean }>
): Partial<EquippedCosmetics> => {
  const partial: Partial<EquippedCosmetics> = {};
  for (const row of inventory) {
    if (!row.equipped) continue;
    const id = row.itemId;
    if (id.startsWith('deck_')) partial.deck = id;
    if (id.startsWith('chip_')) partial.chip = id;
    if (id.startsWith('frame_')) partial.frame = id;
    if (id.startsWith('title_')) partial.title = id;
    if (id.startsWith('table_')) partial.table = id;
  }
  return partial;
};

export const writeEquipped = (userId: string, equipped: EquippedCosmetics) => {
  try {
    localStorage.setItem(`${LS_EQUIPPED}:${userId}`, JSON.stringify(equipped));
  } catch {
    /* ignore */
  }
};

export const loadResolvedEquipped = (
  userId: string,
  tier: SubscriptionTier,
  inventory: string[] = [],
  serverInventory?: Array<{ itemId: string; equipped?: boolean }>
): EquippedCosmetics => {
  const fromServer = serverInventory?.length ? equippedFromInventory(serverInventory) : {};
  const hasServerEquipped = Object.keys(fromServer).length > 0;
  const stored = hasServerEquipped ? fromServer : readEquipped(userId);
  return resolveEquipped(stored, tier, inventory);
};

const resolveUrl = (id: string, fallbackId: string): string =>
  cosmeticImageUrl(id) ?? cosmeticImageUrl(fallbackId) ?? cosmeticById(fallbackId)!.imageUrl;

export const deckBackUrl = (deckId: string): string =>
  resolveUrl(deckId, defaultEquipped().deck);

export const chipImageUrl = (chipId: string): string =>
  resolveUrl(chipId, defaultEquipped().chip);

export const frameImageUrl = (frameId: string): string =>
  resolveUrl(frameId, defaultEquipped().frame);

export const tableFeltUrl = (tableId: string): string =>
  cosmeticImageUrl(tableId) ?? '/assets/table-felt.png';

export type TableFeltVisual = {
  url: string;
  className: string;
  backgroundImage: string;
  backgroundSize: string;
  meshColor: string;
  rimColor: string;
  ambientGlow: string;
};

export const tableFeltVisual = (tableId: string): TableFeltVisual => {
  const url = tableFeltUrl(tableId);
  if (tableId === 'table_void') {
    return {
      url,
      className: 'table-felt-void',
      backgroundImage: `radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, transparent 50%), radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 55%), url(${url})`,
      backgroundSize: 'cover',
      meshColor: '#0a0618',
      rimColor: '#6d28d9',
      ambientGlow: 'rgba(139, 92, 246, 0.28)'
    };
  }
  return {
    url,
    className: 'table-felt-classic',
    backgroundImage: `radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 55%), url(${url})`,
    backgroundSize: 'cover, 280px 280px',
    meshColor: '#0d3d28',
    rimColor: '#c9a227',
    ambientGlow: 'rgba(232, 197, 71, 0.18)'
  };
};

export const titleImageUrl = (titleId: string): string | undefined =>
  titleId ? cosmeticImageUrl(titleId) : undefined;

/** Catalog / profile preview — rich still for decks, transparent cutout for chips & frames */
export const cosmeticPreviewUrl = (id: string): string | undefined => {
  const def = cosmeticById(id);
  if (!def) return undefined;
  if (def.slot === 'deck' || def.slot === 'table') return def.imageUrl;
  return def.gameImageUrl ?? def.imageUrl;
};

export const titleDisplayLabel = (titleId: string): string | undefined =>
  titleBadgeLabel(titleId) ?? cosmeticById(titleId)?.name;

export const isPremiumDeck = (deckId: string): boolean =>
  deckId.startsWith('deck_') && deckId !== 'deck_classic';

export const avatarGradient = (tier: SubscriptionTier): string => {
  switch (tier) {
    case 'BLACK':
      return 'from-amber-400/25 via-gold/20 to-zinc-900/30';
    case 'DIAMOND':
      return 'from-cyan-400/30 via-sky-500/20 to-blue-900/20';
    case 'PLATINUM':
      return 'from-violet-500/30 via-indigo-500/20 to-sky-400/15';
    case 'GOLD':
      return 'from-gold/35 via-amber-600/20 to-emerald/10';
    case 'SILVER':
      return 'from-zinc-300/25 via-zinc-500/15 to-zinc-700/10';
    case 'BRONZE':
      return 'from-amber-700/25 via-orange-800/15 to-zinc-800/10';
    default:
      return 'from-emerald/20 via-surface to-background';
  }
};

export const initialsFromName = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};
