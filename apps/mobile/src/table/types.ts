import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';

export type TablePlayerVisual = {
  userId: string;
  name: string;
  stack: number;
  roundBet?: number;
  isDealer?: boolean;
  avatar?: string | null;
  tableStatus?: string | null;
  tier?: SubscriptionTier;
  equipped?: Partial<EquippedCosmetics>;
  inventory?: string[];
  holeCards?: Card[];
  /** Render N face-down cards when holeCards empty (opponent in hand). */
  hiddenCardCount?: number;
  revealCards?: boolean;
  isActive?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isHero?: boolean;
  /** JOKER: tricks won this hand */
  tricksWon?: number;
};
