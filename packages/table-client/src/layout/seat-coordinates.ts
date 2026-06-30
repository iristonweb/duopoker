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

export function seatAnchorTransform(anchor: SeatAnchor): string {
  return anchor === 'bottom' ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)';
}

/** Inline style for absolute seat placement (matches chip-flight anchors). */
export function seatPositionStyle(
  index: number,
  total: number
): { left: string; top: string; transform: string } {
  const pos = seatCoordinates(index, total);
  return {
    left: `${pos.left}%`,
    top: `${pos.top}%`,
    transform: seatAnchorTransform(pos.anchor)
  };
}

/** Percent-based seat positions within the felt ellipse (hero rotated to bottom). */
export function seatCoordinates(index: number, total: number): SeatPosition {
  if (total <= 2) {
    return index === 0
      ? { left: 50, top: 10, anchor: 'center' }
      : { left: 50, top: 88, anchor: 'bottom' };
  }
  if (total === 4) {
    const ring: SeatPosition[] = [
      { left: 50, top: 10, anchor: 'center' },
      { left: 86, top: 48, anchor: 'center' },
      { left: 14, top: 48, anchor: 'center' },
      { left: 50, top: 86, anchor: 'bottom' }
    ];
    return ring[index] ?? ring[0]!;
  }
  const positions: SeatPosition[] = [
    { left: 50, top: 10, anchor: 'center' },
    { left: 86, top: 22, anchor: 'center' },
    { left: 86, top: 68, anchor: 'center' },
    { left: 50, top: 86, anchor: 'bottom' },
    { left: 14, top: 68, anchor: 'center' },
    { left: 14, top: 22, anchor: 'center' }
  ];
  return positions[index % positions.length] ?? positions[0]!;
}

/** Bubble offset toward felt center from seat rim. */
export function bubbleOffset(index: number, total: number): BubbleOffset {
  if (total <= 2) {
    return index === 0 ? { dx: 0, dy: 8, anchor: 'below' } : { dx: 0, dy: -40, anchor: 'above' };
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
      return { dx: 0, dy: -48, anchor: 'above' };
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
      : 'bottom-[10%] left-1/2 -translate-x-1/2 table-compact:bottom-[12%] max-table-compact:bottom-[8%]';
  }
  if (total === 4) {
    const ring = [
      'left-1/2 top-[8%] -translate-x-1/2 table-compact:top-[10%] max-table-compact:top-[6%]',
      'right-[8%] top-1/2 -translate-y-1/2 table-compact:right-[10%] max-table-compact:right-[10%]',
      'left-[8%] top-1/2 -translate-y-1/2 table-compact:left-[10%] max-table-compact:left-[10%]',
      'left-1/2 bottom-[8%] -translate-x-1/2 table-compact:bottom-[10%] max-table-compact:bottom-[6%]'
    ];
    return ring[index] ?? ring[0]!;
  }
  const positions = [
    'left-1/2 top-[8%] -translate-x-1/2 table-compact:top-[10%] max-table-compact:top-[6%]',
    'right-[8%] top-[20%] table-compact:right-[10%] table-compact:top-[16%] max-table-compact:right-[10%] max-table-compact:top-[18%]',
    'right-[8%] bottom-[24%] table-compact:right-[10%] table-compact:bottom-[20%] max-table-compact:right-[10%] max-table-compact:bottom-[22%]',
    'left-1/2 bottom-[8%] -translate-x-1/2 table-compact:bottom-[10%] max-table-compact:bottom-[6%]',
    'left-[8%] bottom-[24%] table-compact:left-[10%] table-compact:bottom-[20%] max-table-compact:left-[10%] max-table-compact:bottom-[22%]',
    'left-[8%] top-[20%] table-compact:left-[10%] table-compact:top-[16%] max-table-compact:left-[10%] max-table-compact:top-[18%]'
  ];
  return positions[index % positions.length] ?? positions[0]!;
};

export const bubbleOffsetTailwind = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'top-full left-1/2 mt-1 -translate-x-1/2 max-table-compact:mt-2'
      : 'bottom-full left-1/2 mb-2 -translate-x-1/2 max-table-compact:mb-3';
  }
  if (total === 4) {
    switch (index) {
      case 0:
        return 'top-full left-1/2 mt-2 -translate-x-1/2';
      case 1:
        return 'right-full top-1/2 mr-2 -translate-y-1/2 translate-x-0 max-table-compact:mr-3';
      case 2:
        return 'left-full top-1/2 ml-2 -translate-y-1/2 translate-x-0 max-table-compact:ml-3';
      case 3:
        return 'bottom-full left-1/2 mb-3 -translate-x-1/2 max-table-compact:mb-4';
      default:
        return 'bottom-full left-1/2 mb-3 -translate-x-1/2 max-table-compact:mb-4';
    }
  }
  const region = index % 6;
  switch (region) {
    case 0:
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    case 1:
    case 2:
      return 'right-full top-1/2 mr-2 -translate-y-1/2 translate-x-0 max-table-compact:mr-3';
    case 3:
      return 'bottom-full left-1/2 mb-3 -translate-x-1/2 max-table-compact:mb-4';
    case 4:
    case 5:
      return 'left-full top-1/2 ml-2 -translate-y-1/2 translate-x-0 max-table-compact:ml-3';
    default:
      return 'bottom-full left-1/2 mb-3 -translate-x-1/2 max-table-compact:mb-4';
  }
};

/** Corner offset for turn timer badge — outside avatar, away from table center. */
export const timerOffsetTailwind = (index: number, total: number): string => {
  if (total <= 2) {
    return '-right-2 -top-2';
  }
  if (total === 4) {
    switch (index) {
      case 0:
        return '-right-2 -top-2';
      case 1:
        return '-left-2 -top-2';
      case 2:
        return '-right-2 -top-2';
      case 3:
        return '-right-2 -top-2';
      default:
        return '-right-2 -top-2';
    }
  }
  const region = index % 6;
  switch (region) {
    case 0:
      return '-right-2 -top-2';
    case 1:
    case 2:
      return '-left-2 -top-2';
    case 3:
      return '-right-2 -top-2';
    case 4:
    case 5:
      return '-right-2 -top-2';
    default:
      return '-right-2 -top-2';
  }
};
