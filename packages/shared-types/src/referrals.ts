import type { PaidSubscriptionTier } from './pricing';
import type { SubscriptionTier } from './cosmetics';

/** Hands played on platform (non-bot) to count a referred user as active. */
export const REFERRAL_ACTIVE_MIN_HANDS = 20;

/** Minimum account age (ms) before a referral can become active. */
export const REFERRAL_ACTIVE_MIN_AGE_MS = 72 * 60 * 60 * 1000;

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
  labelRu: string;
  labelEn: string;
};

/** Reward ladder — claim each level once when active referral count is met. */
export const REFERRAL_MILESTONES: ReferralMilestone[] = [
  {
    level: 1,
    activeReferralsRequired: 5,
    chips: 2_500,
    labelRu: '5 активных — 2 500 фишек',
    labelEn: '5 active — 2,500 chips'
  },
  {
    level: 2,
    activeReferralsRequired: 12,
    chips: 6_000,
    cosmeticsTier: 'BRONZE',
    labelRu: '12 активных — 6 000 фишек + косметика Bronze',
    labelEn: '12 active — 6,000 chips + Bronze cosmetics'
  },
  {
    level: 3,
    activeReferralsRequired: 25,
    chips: 12_000,
    subscriptionTier: 'SILVER',
    subscriptionDays: 30,
    labelRu: '25 активных — 12 000 фишек + Silver 30 дней',
    labelEn: '25 active — 12,000 chips + Silver 30 days'
  },
  {
    level: 4,
    activeReferralsRequired: 50,
    chips: 30_000,
    subscriptionTier: 'GOLD',
    subscriptionDays: 30,
    labelRu: '50 активных — 30 000 фишек + Gold 30 дней',
    labelEn: '50 active — 30,000 chips + Gold 30 days'
  },
  {
    level: 5,
    activeReferralsRequired: 100,
    chips: 75_000,
    subscriptionTier: 'PLATINUM',
    subscriptionDays: 45,
    labelRu: '100 активных — 75 000 фишек + Platinum 45 дней',
    labelEn: '100 active — 75,000 chips + Platinum 45 days'
  },
  {
    level: 6,
    activeReferralsRequired: 200,
    chips: 150_000,
    subscriptionTier: 'BLACK',
    subscriptionDays: 60,
    labelRu: '200 активных — 150 000 фишек + Black 60 дней',
    labelEn: '200 active — 150,000 chips + Black 60 days'
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
