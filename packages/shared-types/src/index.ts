export {
  breakpoints,
  colors,
  motion,
  radii,
  shadows,
  type BrandColors
} from './theme';

export { ACTION_TIMEOUT_MS, NEXT_HAND_DELAY_MS } from './game-timing';

export {
  brandFullName,
  brandLogoUrl,
  brandName,
  siteDescriptionEn,
  siteDescriptionRu,
  siteUrl
} from './brand';

export {
  PAID_SUBSCRIPTION_TIERS,
  perksUnlockedAtTier,
  subscriptionCosmeticsUpToTier,
  subscriptionCosmeticsForPaidTier,
  paidCosmeticSetsUpToTier,
  SUBSCRIPTION_PERK_MIN_TIER,
  tierHasPerk,
  type SubscriptionPerkId
} from './subscription-perks';

export {
  catalogCosmetics,
  catalogGameModes,
  lobbyHeroBanner,
  lobbyPreviewBanner,
  clubsHeroBanner,
  appBackgroundUrl,
  cardsBackgroundUrl,
  subscriptionBannerImages,
  organizerPlanBanners,
  chipPackImages,
  type CatalogCosmetic,
  type CatalogGameMode,
  type CatalogSubscription,
  type OrganizerPlanTier
} from './catalog-assets';

export {
  allCosmetics,
  bonusCosmetics,
  bestCosmeticForTier,
  canEquipCosmetic,
  catalogPreviewUrl,
  cosmeticById,
  cosmeticImageUrl,
  cosmeticsBySlot,
  defaultCosmeticForSlot,
  defaultEquipped,
  deckBackEffectClass,
  gameChipId,
  resolveEquipped,
  subscriptionCosmetics,
  subscriptionCosmeticsBySlot,
  tierLabel,
  titleBadgeLabel,
  tierMeetsRequirement,
  TIER_RANK,
  type CosmeticDefinition,
  type CosmeticSlot,
  type EquippedCosmetics,
  type SubscriptionTier
} from './cosmetics';

export {
  SUBSCRIPTION_PRICES_RUB,
  CHIP_PACK_PRICES_RUB,
  ORGANIZER_PLAN_PRICES_RUB,
  ORGANIZER_SKU_IDS,
  organizerSkuForTier,
  formatRubMonthly,
  formatRubOnce,
  type PaidSubscriptionTier,
  type OrganizerSkuId
} from './pricing';

export {
  REFERRAL_ACTIVE_MIN_HANDS,
  REFERRAL_ACTIVE_MIN_AGE_MS,
  REFERRAL_CODE_WINDOW_DAYS,
  REFERRAL_MILESTONES,
  referralMilestoneByLevel,
  nextReferralMilestone,
  type ReferralMilestone,
  type ReferralStatus,
  type ReferralRewardKind
} from './referrals';

import type { GameMode } from './game-mode';
export type { GameMode, LegacyGameMode } from './game-mode';
export { normalizeGameMode } from './game-mode';

export {
  JOKER_RECOMMENDED_PLAYERS,
  JOKER_TOTAL_HANDS,
  clampMatchPlayerCount,
  clubTableMaxPlayers,
  jokerCardsPerHand,
  jokerPoolLabel,
  matchmakingPlayerTarget,
  minPlayersToStart
} from './joker-schedule';

export {
  JOKER_WILD_IDS,
  cardSuit,
  isJokerCard,
  isNominalTrumpBanned,
  jokerLegalPlays,
  leadSuitFromTrick,
  normalizeJokerCard
} from './joker-legality';

export type GamePhase = 'DEAL' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
export type GameStreet =
  | 'LOBBY'
  | 'TUZOVANIE'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'TRUMP_CHOICE'
  | 'BIDDING'
  | 'TRICKS'
  | 'COMPLETE';
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export type JokerDeclaration =
  | 'nominal'
  | 'senior'
  | 'minor'
  | { suit: Suit; rankMode: 'senior' | 'minor' };

export interface JokerTrickPlay {
  userId: string;
  card: Card;
  declaration?: JokerDeclaration;
}

export interface JokerDealRecord {
  matchHandIndex: number;
  pool: 1 | 2 | 3 | 4;
  cardsThisDeal: number;
  bids: Record<string, number>;
  tricksWon: Record<string, number>;
  handPoints: Record<string, number>;
}

export type JokerScoringMode = 'classic' | 'minus';

/** Optional JOKER match rules (club variants). */
export interface JokerMatchRules {
  /** Lead with joker only when hand is all jokers */
  strictJoker?: boolean;
  scoringMode?: JokerScoringMode;
}

export interface JokerHandState {
  /** 0..23 index within the 24-hand match */
  matchHandIndex: number;
  cardsThisDeal: number;
  pool: 1 | 2 | 3 | 4;
  trumpSuit: Suit | null;
  trumpCard?: Card;
  /** Undefined = not yet bid */
  bids: Record<string, number | undefined>;
  tricksWon: Record<string, number>;
  currentTrick: JokerTrickPlay[];
  trickNumber: number;
  /** Cumulative match score (points) */
  scores: Record<string, number>;
  /** Points earned this hand per player */
  handPoints?: Record<string, number>;
  /** Completed deals in this match (for score notebook) */
  dealHistory?: JokerDealRecord[];
  /** Winner of the most recently completed trick */
  lastTrickWinner?: string;
  /** Tuzovanie: cards revealed per player until an ace is found */
  tuzovanieRevealed?: Record<string, Card[]>;
  /** Tuzovanie: chronological reveal order for step-by-step UI */
  tuzovanieLog?: { userId: string; card: Card }[];
  /** Tuzovanie: index of player currently receiving a reveal card */
  tuzovanieActiveIndex?: number;
  /** Pool premium adjustments applied at end of each pool */
  poolPremiums?: Record<string, number>;
  /** True after a void-suit dump trick while no trump was in play (blocks nominal trump jokers). */
  voidTrumpDiscards?: boolean;
  /** Seat index of the player who made the first bid this hand (leads trick 1). */
  firstBidderIndex?: number;
}

export interface PlayerAction {
  sessionId: string;
  userId: string;
  type: 'bet' | 'check' | 'fold' | 'call' | 'raise' | 'bid' | 'playCard' | 'chooseTrump';
  amount?: number;
  /** Raise increment above the previous max bet (display only) */
  raiseBy?: number;
  card?: Card;
  /** Trump suit for chooseTrump; omit or null = no trump */
  trumpSuit?: Suit | null;
  /** Joker play declaration (6♠ / 6♣ only) */
  declaration?: JokerDeclaration;
  /** True when the action committed the player's entire remaining stack */
  allIn?: boolean;
  at: number;
}

export interface SessionState {
  sessionId: string;
  mode: GameMode;
  phase: GamePhase;
  /** Betting / deal street; drives server rules */
  street: GameStreet;
  pot: number;
  buyIn: number;
  smallBlind: number;
  bigBlind: number;
  seed: number;
  handNumber: number;
  players: string[];
  dealerIndex: number;
  activePlayerIndex: number;
  currentBet: number;
  playerRoundBet: Record<string, number>;
  communityCards: Card[];
  playerCards: Record<string, Card[]>;
  stacks: Record<string, number>;
  foldedPlayerIds: string[];
  actionLog: PlayerAction[];
  deck: Card[];
  lastAggressor: string | null;
  /** Minimum raise increment this betting round (NLHE: last full raise size) */
  lastRaiseSize: number;
  /** Players who have committed their entire stack this hand */
  allInPlayerIds: string[];
  /** Whether each player has acted since the last raise this street */
  actedThisRound: Record<string, boolean>;
  /** Total chips committed this hand (blinds, antes, bets) per player */
  handContributions: Record<string, number>;
  /** User ids ready to deal the next hand after COMPLETE */
  readyForNextHand: string[];
  /** Unix ms when the current hand reached COMPLETE (for auto-deal delay) */
  handCompletedAt?: number;
  /** Unix ms deadline for the active human player to act */
  actionDeadlineAt?: number;
  winners?: string[];
  winnersShare?: Record<string, number>;
  /** Board that would have run out after a preflop fold-win (subscription perk). */
  ghostCommunityCards?: Card[];
  /** Trick-taking state for Joker mode */
  joker?: JokerHandState;
  /** JOKER-only match rule variants */
  jokerRules?: JokerMatchRules;
  /** @deprecated still populated for older clients — use activePlayerIndex */
  activePlayerId?: string;
}

/** Minimum subscription tier to reveal ghost board after a preflop muck-win. */
export const GHOST_BOARD_MIN_TIER = 'BRONZE' as const;

export interface ReplayFrame {
  at: number;
  phase: GamePhase;
  pot: number;
  actor: string;
  action: PlayerAction['type'];
}

export interface MatchmakingTicket {
  userId: string;
  mode: GameMode;
  buyIn: number;
  createdAt: number;
}

export type { TableChatMessage } from './table-chat';
