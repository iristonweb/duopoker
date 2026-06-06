import type { PaidSubscriptionTier } from './pricing';
import type { SubscriptionTier } from './cosmetics';

/** Hands played on platform (non-bot) to count a referred user as active. */
export const REFERRAL_ACTIVE_MIN_HANDS = 5;

/** Minimum account age (ms) before a referral can become active. */
export const REFERRAL_ACTIVE_MIN_AGE_MS = 24 * 60 * 60 * 1000;

/** Days after registration to attach a referral code. */
export const REFERRAL_CODE_WINDOW_DAYS = 7;

export type ReferralRewardKind = 'chips' | 'cosmetics' | 'subscription';

export type ReferralMilestone = {
  level: number;
  activeReferralsRequired: number;
  chips: number;
  cosmeticsTier?: PaidSubscriptionTier;
  subscriptionTier?: PaidSubscriptionTier;
  subscriptionDays?: number;
  subscriptionLifetime?: boolean;
  labelRu: string;
  labelEn: string;
};

/** Reward ladder — claim each level once when active referral count is met. */
export const REFERRAL_MILESTONES: ReferralMilestone[] = [
  {
    level: 1,
    activeReferralsRequired: 1,
    chips: 1_000,
    labelRu: '1 активный друг — 1 000 фишек',
    labelEn: '1 active friend — 1,000 chips'
  },
  {
    level: 2,
    activeReferralsRequired: 3,
    chips: 3_000,
    cosmeticsTier: 'BRONZE',
    labelRu: '3 активных — 3 000 фишек + косметика Bronze',
    labelEn: '3 active — 3,000 chips + Bronze cosmetics'
  },
  {
    level: 3,
    activeReferralsRequired: 5,
    chips: 5_000,
    subscriptionTier: 'SILVER',
    subscriptionDays: 30,
    labelRu: '5 активных — 5 000 фишек + Silver 30 дней',
    labelEn: '5 active — 5,000 chips + Silver 30 days'
  },
  {
    level: 4,
    activeReferralsRequired: 10,
    chips: 15_000,
    subscriptionTier: 'GOLD',
    subscriptionDays: 30,
    labelRu: '10 активных — 15 000 фишек + Gold 30 дней',
    labelEn: '10 active — 15,000 chips + Gold 30 days'
  },
  {
    level: 5,
    activeReferralsRequired: 25,
    chips: 50_000,
    subscriptionTier: 'PLATINUM',
    subscriptionDays: 30,
    labelRu: '25 активных — 50 000 фишек + Platinum 30 дней',
    labelEn: '25 active — 50,000 chips + Platinum 30 days'
  },
  {
    level: 6,
    activeReferralsRequired: 50,
    chips: 100_000,
    subscriptionTier: 'BLACK',
    subscriptionLifetime: true,
    labelRu: '50 активных — 100 000 фишек + Black навсегда',
    labelEn: '50 active — 100,000 chips + Black lifetime'
  }
];

export const referralMilestoneByLevel = (level: number): ReferralMilestone | undefined =>
  REFERRAL_MILESTONES.find((m) => m.level === level);

export const nextReferralMilestone = (
  activeCount: number
): ReferralMilestone | undefined =>
  REFERRAL_MILESTONES.find((m) => m.activeReferralsRequired > activeCount);

export type ReferralStatus = 'PENDING' | 'ACTIVE';

export const isPaidTier = (tier: SubscriptionTier): tier is PaidSubscriptionTier => tier !== 'FREE';
