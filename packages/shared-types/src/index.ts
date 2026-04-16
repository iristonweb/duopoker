export {
  breakpoints,
  colors,
  motion,
  radii,
  shadows,
  type BrandColors
} from './theme';

export type GameMode = 'HOLDEM' | 'RASPISNOY';
export type GamePhase = 'DEAL' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
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
  pot: number;
  activePlayerId?: string;
  communityCards?: Card[];
  playerCards?: Record<string, Card[]>;
  foldedPlayerIds?: string[];
  actionLog?: PlayerAction[];
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
