/** Felt-relative center anchors — keep in sync with PokerTable3D / MobileTableSurface. */
export type TableSurfaceLayout = 'ring' | 'mobile-arc';

export const TABLE_CENTER_ANCHORS = {
  ring: {
    potTop: 27,
    boardTop: 37,
    tickerTop: 50,
    allInTop: 11,
    jokerFlightTop: 38
  },
  'mobile-arc': {
    potTop: 18,
    boardTop: 38,
    tickerTop: 52,
    allInTop: 9,
    jokerFlightTop: 38
  }
} as const;

export function tableCenterPercent(
  layout: TableSurfaceLayout,
  key: keyof (typeof TABLE_CENTER_ANCHORS)['ring']
): number {
  return TABLE_CENTER_ANCHORS[layout][key];
}

export function potFlightAnchor(layout: TableSurfaceLayout): { x: number; y: number } {
  return { x: 50, y: tableCenterPercent(layout, 'potTop') };
}
