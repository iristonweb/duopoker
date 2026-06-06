import {
  cosmeticById,
  defaultEquipped,
  resolveEquipped,
  titleBadgeLabel,
  type EquippedCosmetics,
  type SubscriptionTier
} from '@duopoker/shared-types';

const LS_EQUIPPED = 'duopoker_equipped_v3';

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
  inventory: string[] = []
): EquippedCosmetics => resolveEquipped(readEquipped(userId), tier, inventory);

export const deckBackUrl = (deckId: string): string =>
  cosmeticById(deckId)?.imageUrl ?? cosmeticById(defaultEquipped().deck)!.imageUrl;

export const chipImageUrl = (chipId: string): string =>
  cosmeticById(chipId)?.imageUrl ?? cosmeticById(defaultEquipped().chip)!.imageUrl;

export const frameImageUrl = (frameId: string): string =>
  cosmeticById(frameId)?.imageUrl ?? cosmeticById(defaultEquipped().frame)!.imageUrl;

export const titleImageUrl = (titleId: string): string | undefined =>
  titleId ? cosmeticById(titleId)?.imageUrl : undefined;

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
