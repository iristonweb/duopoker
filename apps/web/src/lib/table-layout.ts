export {
  rotatePlayersForHero,
  isBotUserId,
  botDisplayIndex,
  seatLayoutTailwind as seatLayout,
  bubbleOffsetTailwind as bubbleOffset
} from '@duopoker/table-client';

/** Shared bounds for felt + seat positioning (must match PokerTable3D). */
export const feltPlayAreaClass =
  'absolute left-1/2 top-[8%] h-[74%] w-[94%] max-w-[52rem] -translate-x-1/2 table-compact:top-[5%] table-compact:h-[80%] table-compact:w-[78%] max-table-compact:top-[10%] max-table-compact:h-[72%] max-table-compact:w-[90%]';
