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

/** Inline style for absolute seat placement (matches chip-flight anchors). */
export function seatPositionStyle(
  index: number,
  total: number
): { left: string; top: string; transform: string } {
  const pos = seatCoordinates(index, total);
  return {
    left: `${pos.left}%`,
    top: `${pos.top}%`,
    transform: 'translate(-50%, -50%)'
  };
}

/** Percent-based seat positions within the felt ellipse (hero rotated to bottom). */
export function seatCoordinates(index: number, total: number): SeatPosition {
  if (total <= 2) {
    return index === 0
      ? { left: 50, top: 10, anchor: 'center' }
      : { left: 50, top: 92, anchor: 'bottom' };
  }
  if (total === 4) {
    const ring: SeatPosition[] = [
      { left: 50, top: 8, anchor: 'center' },
      { left: 92, top: 48, anchor: 'center' },
      { left: 8, top: 48, anchor: 'center' },
      { left: 50, top: 92, anchor: 'bottom' }
    ];
    return ring[index] ?? ring[0]!;
  }
  const positions: SeatPosition[] = [
    { left: 50, top: 8, anchor: 'center' },
    { left: 92, top: 18, anchor: 'center' },
    { left: 92, top: 72, anchor: 'center' },
    { left: 50, top: 92, anchor: 'bottom' },
    { left: 8, top: 72, anchor: 'center' },
    { left: 8, top: 18, anchor: 'center' }
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
  if (total === 4) {
    switch (index) {
      case 0:
        return { dx: 0, dy: 10, anchor: 'below' };
      case 1:
        return { dx: -8, dy: 0, anchor: 'left' };
      case 2:
        return { dx: 8, dy: 0, anchor: 'right' };
      case 3:
        return { dx: 0, dy: -40, anchor: 'above' };
      default:
        return { dx: 0, dy: -40, anchor: 'above' };
    }
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
      ? 'left-1/2 top-[10%] -translate-x-1/2 table-compact:top-[12%] max-table-compact:top-[6%]'
      : 'bottom-[8%] left-1/2 -translate-x-1/2 table-compact:bottom-[12%] max-table-compact:bottom-[6%]';
  }
  if (total === 4) {
    const ring = [
      'left-1/2 top-[6%] -translate-x-1/2 table-compact:top-[8%] max-table-compact:top-[4%]',
      'right-[4%] top-1/2 -translate-y-1/2 table-compact:right-[6%] max-table-compact:right-[6%]',
      'left-[4%] top-1/2 -translate-y-1/2 table-compact:left-[6%] max-table-compact:left-[6%]',
      'left-1/2 bottom-[4%] -translate-x-1/2 table-compact:bottom-[8%] max-table-compact:bottom-[4%]'
    ];
    return ring[index] ?? ring[0]!;
  }
  const positions = [
    'left-1/2 top-[6%] -translate-x-1/2 table-compact:top-[8%] max-table-compact:top-[4%]',
    'right-[4%] top-[18%] table-compact:right-[6%] table-compact:top-[14%] max-table-compact:right-[6%] max-table-compact:top-[16%]',
    'right-[4%] bottom-[22%] table-compact:right-[6%] table-compact:bottom-[18%] max-table-compact:right-[6%] max-table-compact:bottom-[20%]',
    'left-1/2 bottom-[4%] -translate-x-1/2 table-compact:bottom-[8%] max-table-compact:bottom-[4%]',
    'left-[4%] bottom-[22%] table-compact:left-[6%] table-compact:bottom-[18%] max-table-compact:left-[6%] max-table-compact:bottom-[20%]',
    'left-[4%] top-[18%] table-compact:left-[6%] table-compact:top-[14%] max-table-compact:left-[6%] max-table-compact:top-[16%]'
  ];
  return positions[index % positions.length] ?? positions[0]!;
};

export const bubbleOffsetTailwind = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'top-full left-1/2 mt-1 -translate-x-1/2 max-table-compact:mt-2'
      : '-top-10 left-1/2 -translate-x-1/2 max-table-compact:-top-14';
  }
  if (total === 4) {
    switch (index) {
      case 0:
        return 'top-full left-1/2 mt-2 -translate-x-1/2';
      case 1:
        return 'right-full top-1/2 mr-1 -translate-y-1/2 translate-x-0 max-table-compact:mr-2';
      case 2:
        return 'left-full top-1/2 ml-1 -translate-y-1/2 translate-x-0 max-table-compact:ml-2';
      case 3:
        return '-top-10 left-1/2 -translate-x-1/2 max-table-compact:-top-14';
      default:
        return '-top-10 left-1/2 -translate-x-1/2 max-table-compact:-top-14';
    }
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
