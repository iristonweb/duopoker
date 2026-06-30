export { bindTableSocket, detachTableSocket, TABLE_SOCKET_EVENTS, type TableSocketHandlers } from './socket-bindings';
export { createApiHelpers, type TableClientConfig } from './config';
export {
  createTableSessionStore,
  type TableSessionStore,
  type TableSessionStoreApi,
  type TableStoreDeps,
  type PlayerActionPayload,
  type TableSessionCallbacks
} from './create-table-store';

export { rotatePlayersForHero, isBotUserId, botDisplayIndex } from './layout/rotate-players';
export {
  seatCoordinates,
  seatPositionStyle,
  bubbleOffset,
  seatLayoutTailwind,
  bubbleOffsetTailwind,
  timerOffsetTailwind,
  type SeatPosition,
  type BubbleOffset,
  type SeatAnchor
} from './layout/seat-coordinates';

export {
  mobileSeatCoordinates,
  mobileSeatPositionStyle,
  mobileBubbleOffset,
  isHeroSeatIndex
} from './layout/mobile-seat-coordinates';

export { useTableChat } from './hooks/useTableChat';
export {
  resolveCoachEligibility,
  useCoachEligibility,
  type CoachEligibility,
  type CoachStatusPayload
} from './hooks/useCoachEligibility';

export {
  resolveVoiceEligibility,
  useVoiceEligibility,
  type VoiceEligibility,
  type VoiceStatusPayload
} from './hooks/useVoiceEligibility';

export { computeHeroBustState, type HeroBustInput, type HeroBustState } from './session/hero-bust-state';

export * from './session/table-session-steps';
export {
  formatTableError,
  isChatErrorCode,
  CHAT_ERROR_CODES,
  type ChatErrorCode
} from './session/table-errors';

export {
  describeHoldemStrength,
  holdemShowdownHandLines
} from './holdem/hand-rank';
export {
  holdemSidePotAmounts,
  holdemSidePotSummary,
  potIndexForChipFlight
} from './holdem/side-pots';

export {
  formatCardLabel,
  suitSymbol,
  suitLabel,
  isRedSuit,
  jokerTrumpDisplay,
  type JokerTrumpDisplay
} from './joker/labels';
export { formatJokerDeclaration, formatJokerPlayLine } from './joker/declaration-label';

export {
  formatSeatActionShort,
  seatActionIcon,
  type SeatActionKind,
  type SeatActionDisplay
} from './feed/seat-action-format';

export {
  maxRoundBet,
  amountToCall,
  sessionKettle,
  computeRaiseBounds,
  halfPotRaise,
  potSizedRaise,
  type RaiseBounds
} from './table-derivations';

export {
  buildTableLeaderboard,
  leaderboardFeedKey,
  leaderboardLeaders,
  type TableLeaderboardEntry
} from './leaderboard/table-leaderboard';

export { useTableDisplayState } from './hooks/useTableDisplayState';
export { useTableSessionTick, type TableSessionTickDeps } from './hooks/useTableSessionTick';
export {
  useTableAnimationQueue,
  type SeatActionBubble,
  type ChipFlight,
  type JokerCardFlight
} from './hooks/useTableAnimationQueue';
export {
  useTableGameFeed,
  useCommunityCardSounds,
  type GameFeedEvent
} from './hooks/useTableGameFeed';
export type { TableAnimationCallbacks, TableHapticKind, TableSoundKind } from './hooks/types';
