import type { SubscriptionTier } from './cosmetics';

export type PaidSubscriptionTier = Exclude<SubscriptionTier, 'FREE'>;

/** Player subscription prices (RUB / month). */
export const SUBSCRIPTION_PRICES_RUB: Record<PaidSubscriptionTier, number> = {
  SILVER: 490,
  GOLD: 990,
  PLATINUM: 1990,
  ROYAL: 4990
};

/** One-time chip pack prices (RUB). */
export const CHIP_PACK_PRICES_RUB: Record<string, number> = {
  chips_2500: 299,
  chips_10000: 990
};

/** Organizer club plan prices (RUB / month). */
export const ORGANIZER_PLAN_PRICES_RUB = {
  PRO: 2990,
  NETWORK: 7990
} as const;

export const formatRubMonthly = (amount: number): string =>
  amount === 0 ? 'Бесплатно' : `${amount.toLocaleString('ru-RU')} ₽/мес`;

export const formatRubOnce = (amount: number): string => `${amount.toLocaleString('ru-RU')} ₽`;
