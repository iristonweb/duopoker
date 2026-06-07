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
      ? 'left-1/2 top-[10%] -translate-x-1/2 sm:top-[4%] max-sm:landscape:top-[5%]'
      : 'bottom-[8%] left-1/2 -translate-x-1/2 sm:bottom-[4%] max-sm:landscape:bottom-[5%]';
  }
  const positions = [
    'left-1/2 top-[8%] -translate-x-1/2 sm:top-[3%] max-sm:landscape:top-[4%]',
    'right-[1%] top-[16%] sm:right-[4%] sm:top-[20%] max-sm:landscape:right-[3%] max-sm:landscape:top-[10%]',
    'right-[1%] bottom-[26%] sm:right-[5%] sm:bottom-[22%] max-sm:landscape:right-[3%] max-sm:landscape:bottom-[18%]',
    'left-1/2 bottom-[6%] -translate-x-1/2 sm:bottom-[3%] max-sm:landscape:bottom-[4%]',
    'bottom-[26%] left-[1%] sm:bottom-[22%] sm:left-[4%] max-sm:landscape:bottom-[18%] max-sm:landscape:left-[3%]',
    'left-[1%] top-[16%] sm:left-[4%] sm:top-[20%] max-sm:landscape:left-[3%] max-sm:landscape:top-[10%]'
  ];
  return positions[index % positions.length] ?? positions[0]!;
};

export const bubbleOffsetTailwind = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'top-full left-1/2 mt-1 -translate-x-1/2 sm:mt-2'
      : '-top-10 left-1/2 -translate-x-1/2 sm:-top-14';
  }
  const region = index % 6;
  switch (region) {
    case 0:
      return 'top-full left-1/2 mt-2 -translate-x-1/2';
    case 1:
    case 2:
      return 'right-full top-1/2 mr-1 -translate-y-1/2 translate-x-0 sm:mr-2';
    case 3:
      return '-top-10 left-1/2 -translate-x-1/2 sm:-top-14';
    case 4:
    case 5:
      return 'left-full top-1/2 ml-1 -translate-y-1/2 translate-x-0 sm:ml-2';
    default:
      return '-top-10 left-1/2 -translate-x-1/2 sm:-top-14';
  }
};
