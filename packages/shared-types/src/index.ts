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
  cosmeticById,
  cosmeticsBySlot,
  defaultCosmeticForSlot,
  defaultEquipped,
  resolveEquipped,
  subscriptionCosmetics,
  subscriptionCosmeticsBySlot,
  tierLabel,
  tierMeetsRequirement,
  TIER_RANK,
  type CosmeticDefinition,
  type CosmeticSlot,
  type EquippedCosmetics,
  type SubscriptionTier
} from './cosmetics';

export type GameMode = 'HOLDEM' | 'RASPISNOY';
export type GamePhase = 'DEAL' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
export type GameStreet =
  | 'LOBBY'
  | 'PREFLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN'
  | 'COMPLETE';
export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export interface PlayerAction {
  sessionId: string;
  userId: string;
  type: 'bet' | 'check' | 'fold' | 'call' | 'raise';
  amount?: number;
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
  /** @deprecated still populated for older clients — use activePlayerIndex */
  activePlayerId?: string;
}

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
