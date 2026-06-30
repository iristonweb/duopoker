export {
  rotatePlayersForHero,
  isBotUserId,
  botDisplayIndex,
  heroSeatIndex,
  resolveSeatLayoutIndex,
  seatPositionStyle,
  seatPositionStyleForPlayers,
  isBottomAnchoredSeat,
  tableCenterPercent,
  potFlightAnchor,
  bubbleOffsetTailwind as bubbleOffset,
  timerOffsetTailwind as timerOffset,
  type TableSurfaceLayout
} from '@duopoker/table-client';

/** Shared bounds for felt + seat positioning (must match PokerTable3D). */
export const feltPlayAreaClass =
  'absolute left-1/2 top-[6%] h-[80%] w-[94%] max-w-[56rem] -translate-x-1/2 table-compact:top-[1%] table-compact:h-[86%] table-compact:w-[90%] max-table-compact:top-[6%] max-table-compact:h-[80%] max-table-compact:w-[94%]';

/** Outer wooden rail — slightly larger than felt. */
export const tableRailClass =
  'absolute left-1/2 top-[3%] h-[86%] w-[98%] max-w-[58rem] -translate-x-1/2 table-compact:top-[0%] table-compact:h-[90%] table-compact:w-[94%] max-table-compact:top-[3%] max-table-compact:h-[86%] max-table-compact:w-[98%]';
