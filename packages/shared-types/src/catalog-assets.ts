export type CatalogCosmetic = {
  id: string;
  name: string;
  rarity: string;
  chipCost: number;
  imageUrl: string;
  slot?: 'deck' | 'chip' | 'frame';
  requiredTier?: 'FREE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';
  description?: string;
};

export type CatalogGameMode = {
  id: 'HOLDEM' | 'RASPISNOY';
  title: string;
  description: string;
  imageUrl: string;
};

export type CatalogSubscription = {
  tier: 'SILVER' | 'GOLD' | 'PLATINUM' | 'ROYAL';
  imageUrl: string;
};

export type OrganizerPlanTier = 'BASIC' | 'PRO' | 'NETWORK';

export const lobbyHeroBanner = '/assets/banners/lobby-hero.svg';
export const clubsHeroBanner = '/assets/banners/clubs-hero.svg';
export const appBackgroundUrl = '/assets/banners/app-background.svg';

import { allCosmetics, bonusCosmetics } from './cosmetics';

export const catalogCosmetics: CatalogCosmetic[] = allCosmetics.map((c) => ({
  id: c.id,
  name: c.name,
  rarity: c.rarity,
  chipCost: c.chipCost ?? 0,
  imageUrl: c.imageUrl,
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
    imageUrl: '/assets/modes/holdem.svg'
  },
  {
    id: 'RASPISNOY',
    title: 'Расписной покер',
    description:
      'Five-card duel: antes, one betting round, best hand wins — fast reads, no community board.',
    imageUrl: '/assets/modes/raspisnoy.svg'
  }
];

export const subscriptionBannerImages: Record<CatalogSubscription['tier'], string> = {
  SILVER: '/assets/subscriptions/silver.svg',
  GOLD: '/assets/subscriptions/gold.svg',
  PLATINUM: '/assets/subscriptions/platinum.svg',
  ROYAL: '/assets/subscriptions/royal.svg'
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
