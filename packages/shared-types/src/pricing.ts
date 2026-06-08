import type { SubscriptionTier } from './cosmetics';

export type PaidSubscriptionTier = Exclude<SubscriptionTier, 'FREE'>;

/** Player subscription prices (RUB / month). */
export const SUBSCRIPTION_PRICES_RUB: Record<PaidSubscriptionTier, number> = {
  BRONZE: 290,
  SILVER: 490,
  GOLD: 990,
  PLATINUM: 1990,
  DIAMOND: 2990,
  BLACK: 4990
};

/** One-time chip pack prices (RUB). */
export const CHIP_PACK_PRICES_RUB: Record<string, number> = {
  chips_2500: 299,
  chips_10000: 990
};

/** Canonical SKU IDs for organizer plans (stores + YooKassa metadata). */
export const ORGANIZER_SKU_IDS = {
  BASIC: 'club_basic',
  PRO: 'club_pro',
  NETWORK: 'club_network'
} as const;

export type OrganizerSkuId = (typeof ORGANIZER_SKU_IDS)[keyof typeof ORGANIZER_SKU_IDS];

export const organizerSkuForTier = (tier: 'BASIC' | 'PRO' | 'NETWORK'): OrganizerSkuId =>
  ORGANIZER_SKU_IDS[tier];

/** Organizer club plan prices (RUB / month). */
export const ORGANIZER_PLAN_PRICES_RUB = {
  PRO: 2990,
  NETWORK: 7990
} as const;

export const formatRubMonthly = (amount: number): string =>
  amount === 0 ? 'Бесплатно' : `${amount.toLocaleString('ru-RU')} ₽/мес`;

export const formatRubOnce = (amount: number): string => `${amount.toLocaleString('ru-RU')} ₽`;
