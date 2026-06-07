export type SeatAnchor = 'center' | 'bottom';

export type SeatPosition = {
  left: number;
  top: number;
  anchor: SeatAnchor;
};

export type BubbleOffset = {
  dx: number;
  dy: number;
  anchor: 'above' | 'below' | 'left' | 'right';
};

/** Percent-based seat positions (mobile-first, matches web table-layout). */
export function seatCoordinates(index: number, total: number): SeatPosition {
  if (total <= 2) {
    return index === 0
      ? { left: 50, top: 10, anchor: 'center' }
      : { left: 50, top: 92, anchor: 'bottom' };
  }
  const positions: SeatPosition[] = [
    { left: 50, top: 8, anchor: 'center' },
    { left: 99, top: 16, anchor: 'center' },
    { left: 99, top: 74, anchor: 'center' },
    { left: 50, top: 94, anchor: 'bottom' },
    { left: 1, top: 74, anchor: 'center' },
    { left: 1, top: 16, anchor: 'center' }
  ];
  return positions[index % positions.length] ?? positions[0]!;
}

/** Bubble offset toward felt center from seat rim. */
export function bubbleOffset(index: number, total: number): BubbleOffset {
  if (total <= 2) {
    return index === 0
      ? { dx: 0, dy: 8, anchor: 'below' }
      : { dx: 0, dy: -40, anchor: 'above' };
  }
  const region = index % 6;
  switch (region) {
    case 0:
      return { dx: 0, dy: 10, anchor: 'below' };
    case 1:
    case 2:
      return { dx: -8, dy: 0, anchor: 'left' };
    case 3:
      return { dx: 0, dy: -40, anchor: 'above' };
    case 4:
    case 5:
      return { dx: 8, dy: 0, anchor: 'right' };
    default:
      return { dx: 0, dy: -40, anchor: 'above' };
  }
}

/** Tailwind class strings for web adapter. */
export const seatLayoutTailwind = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'left-1/2 top-[10%] -translate-x-1/2 table-compact:top-[12%] max-table-compact:top-[4%]'
      : 'bottom-[8%] left-1/2 -translate-x-1/2 table-compact:bottom-[14%] max-table-compact:bottom-[4%]';
  }
  const positions = [
    'left-1/2 top-[8%] -translate-x-1/2 table-compact:top-[11%] max-table-compact:top-[3%]',
    'right-[1%] top-[16%] table-compact:right-[6%] table-compact:top-[12%] max-table-compact:right-[4%] max-table-compact:top-[20%]',
    'right-[1%] bottom-[26%] table-compact:right-[6%] table-compact:bottom-[20%] max-table-compact:right-[5%] max-table-compact:bottom-[22%]',
    'left-1/2 bottom-[6%] -translate-x-1/2 table-compact:bottom-[13%] max-table-compact:bottom-[3%]',
    'bottom-[26%] left-[1%] table-compact:bottom-[20%] table-compact:left-[6%] max-table-compact:bottom-[22%] max-table-compact:left-[4%]',
    'left-[1%] top-[16%] table-compact:left-[6%] table-compact:top-[12%] max-table-compact:left-[4%] max-table-compact:top-[20%]'
  ];
  return positions[index % positions.length] ?? positions[0]!;
};

export const bubbleOffsetTailwind = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'top-full left-1/2 mt-1 -translate-x-1/2 max-table-compact:mt-2'
      : '-top-10 left-1/2 -translate-x-1/2 max-table-compact:-top-14';
  }
  const region = index % 6;
  switch (region) {
    case 0:
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    case 1:
    case 2:
      return 'right-full top-1/2 mr-1 -translate-y-1/2 translate-x-0 max-table-compact:mr-2';
    case 3:
      return '-top-10 left-1/2 -translate-x-1/2 max-table-compact:-top-14';
    case 4:
    case 5:
      return 'left-full top-1/2 ml-1 -translate-y-1/2 translate-x-0 max-table-compact:ml-2';
    default:
      return '-top-10 left-1/2 -translate-x-1/2 max-table-compact:-top-14';
  }
};
