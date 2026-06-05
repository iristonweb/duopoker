import {
  cosmeticById,
  defaultEquipped,
  resolveEquipped,
  type EquippedCosmetics,
  type SubscriptionTier
} from '@duopoker/shared-types';

const LS_EQUIPPED = 'duopoker_equipped_v2';

export const readEquipped = (userId: string): Partial<EquippedCosmetics> => {
  try {
    const raw = localStorage.getItem(`${LS_EQUIPPED}:${userId}`);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<EquippedCosmetics>;
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

export const isPremiumDeck = (deckId: string): boolean =>
  deckId === 'deck_platinum' || deckId === 'deck_royal';

export const avatarGradient = (tier: SubscriptionTier): string => {
  switch (tier) {
    case 'ROYAL':
      return 'from-rose-400/30 via-gold/25 to-violet-500/20';
    case 'PLATINUM':
      return 'from-violet-500/30 via-indigo-500/20 to-gold/15';
    case 'GOLD':
      return 'from-gold/35 via-amber-600/20 to-emerald/10';
    case 'SILVER':
      return 'from-zinc-300/25 via-zinc-500/15 to-zinc-700/10';
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
