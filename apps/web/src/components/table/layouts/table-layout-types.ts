import type { TFunction } from 'i18next';
import type { Card, EquippedCosmetics, GameMode, GameStreet, SessionState, SubscriptionTier } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import type { TablePlayerVisual } from '../../PokerTable3D';
import type { ChipFlight, JokerCardFlight, SeatActionBubble } from '../../../hooks/useTableAnimationQueue';
import type { GameFeedEvent } from '../../../hooks/useTableGameFeed';
import type { LeaderboardProfile } from '../LeaderboardPodium';

export type TableLayoutProps = {
  session: SessionState;
  tableView: SessionState;
  userId: string;
  sessionError: string | null;
  leaving: boolean;
  soundOn: boolean;
  musicOn: boolean;
  onSoundToggle: () => void;
  onMusicToggle: () => void;
  onLeaveTable: () => void;
  onMinimizeTable: () => void;
  leaderboardOpen: boolean;
  onLeaderboardOpenChange: (open: boolean) => void;
  leaderboardEntries: TableLeaderboardEntry[];
  leaderboardProfiles: Record<string, LeaderboardProfile>;
  tablePlayers: TablePlayerVisual[];
  seatBubbles: SeatActionBubble[];
  chipFlights: ChipFlight[];
  jokerFlights: JokerCardFlight[];
  potPulseKey: number;
  foldingUsers: string[];
  checkRippleUsers: string[];
  feedEvents: GameFeedEvent[];
  feedPulseKey: number;
  reduceMotion: boolean;
  label: (uid: string) => string;
  t: TFunction;
  equipped: EquippedCosmetics;
  subscriptionTier: SubscriptionTier;
  playerProfiles: Record<
    string,
    {
      name: string;
      avatar?: string | null;
      tableStatus?: string | null;
      subscriptionTier: SubscriptionTier;
      equipped: EquippedCosmetics;
    }
  >;
  viewKettle: number;
  holdemSidePotList: number[];
  jokerBoardCards: Card[];
  jokerBoardKeys?: string[];
  ghostBoardVisible: boolean;
  canPeekGhostBoard: boolean;
  showGhostUpsell: boolean;
  onToggleGhostBoard: () => void;
  showBustedOverlay: boolean;
  showAllInRunoutBanner: boolean;
  onBustedWatch: () => void;
  waitingForPlayers: boolean;
  isJoker: boolean;
  gameOver: boolean;
  jokerMatchOver: boolean;
  matchLeaderNames: string;
  winnerNames: string;
  holdemPayoutSummary?: string;
  jokerHandSummary?: string;
  holdemHandRankLine?: string;
  holdemSidePotLine?: string;
  nextHandSeconds: number | null;
  myTurn: boolean;
  need: number;
  secondsLeft: number | null;
  activeLabel: string;
  lastActionText?: string;
  activeSecondsLeft: number | null;
  activeUserId?: string;
  deckShuffling: boolean;
  heroSpectating: boolean;
  holeCards: Card[];
  raiseAmount: number;
  onRaiseAmountChange: (n: number) => void;
  minTotal: number;
  maxTotal: number;
  canRaise: boolean;
  halfPotRaise: number;
  potRaise: number;
  kettle: number;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  jokerBid: number;
  onJokerBidChange: (n: number) => void;
  onJokerBid: () => void;
  onJokerPlayCard: (card: Card, declaration?: string) => void;
  onJokerChooseTrump: (trumpSuit: string) => void;
  sessionId: string;
  realtimeSocket?: boolean;
};

export type TableHudProps = Pick<
  TableLayoutProps,
  | 'tableView'
  | 'viewKettle'
  | 'session'
  | 'leaving'
  | 'onLeaveTable'
  | 'onMinimizeTable'
  | 'leaderboardEntries'
  | 'leaderboardProfiles'
  | 'userId'
  | 'equipped'
  | 'onLeaderboardOpenChange'
> & { onOpenLeaderboard: () => void; compact?: boolean; tablet?: boolean };

export type TableStreet = GameStreet;
export type TableMode = GameMode;
