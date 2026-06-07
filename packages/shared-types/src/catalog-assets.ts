export type CatalogCosmetic = {
  id: string;
  name: string;
  rarity: string;
  chipCost: number;
  imageUrl: string;
  slot?: 'deck' | 'chip' | 'frame' | 'title' | 'table';
  requiredTier?: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'BLACK';
  description?: string;
};

export type CatalogGameMode = {
  id: 'HOLDEM' | 'JOKER';
  title: string;
  description: string;
  imageUrl: string;
};

export type CatalogSubscription = {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'BLACK';
  imageUrl: string;
};

export type OrganizerPlanTier = 'BASIC' | 'PRO' | 'NETWORK';

export const lobbyHeroBanner = '/assets/banners/lobby-preview.png';
export const lobbyPreviewBanner = '/assets/banners/lobby-preview.png';
export const clubsHeroBanner = '/assets/banners/clubs-hero.png';
export const appBackgroundUrl = '/assets/banners/app-background.svg';
export const cardsBackgroundUrl = '/assets/banners/cards-background.png';

import { allCosmetics, bonusCosmetics, catalogPreviewUrl } from './cosmetics';

export const catalogCosmetics: CatalogCosmetic[] = allCosmetics.map((c) => ({
  id: c.id,
  name: c.name,
  rarity: c.rarity,
  chipCost: c.chipCost ?? 0,
  imageUrl: catalogPreviewUrl(c.id) ?? c.imageUrl,
  slot: c.slot,
  requiredTier: c.requiredTier,
  description: c.description
}));

export { bonusCosmetics };

export const catalogGameModes: CatalogGameMode[] = [
  {
    id: 'HOLDEM',
    title: "Texas Hold'em",
    description: 'No-limit cadence, community cards, and classic showdown tension.',
    imageUrl: '/assets/modes/holdem.png'
  },
  {
    id: 'JOKER',
    title: 'Джокер',
    description:
      'Классический расписной: 4 игрока, 24 сдачи, взятки, козырь и джокеры 6♠/6♣.',
    imageUrl: '/assets/modes/raspisnoy.png'
  }
];

export const subscriptionBannerImages: Record<CatalogSubscription['tier'], string> = {
  BRONZE: '/assets/subscriptions/bronze.png',
  SILVER: '/assets/subscriptions/silver.png',
  GOLD: '/assets/subscriptions/gold.png',
  PLATINUM: '/assets/subscriptions/platinum.png',
  DIAMOND: '/assets/subscriptions/diamond.png',
  BLACK: '/assets/subscriptions/black.png'
};

export const organizerPlanBanners: Record<OrganizerPlanTier, string> = {
  BASIC: '/assets/organizer/basic.svg',
  PRO: '/assets/organizer/pro.svg',
  NETWORK: '/assets/organizer/network.svg'
};

export const chipPackImages: Record<string, string> = {
  chips_2500: '/assets/chips/chips_2500.svg',
  chips_10000: '/assets/chips/chips_10000.svg'
};
