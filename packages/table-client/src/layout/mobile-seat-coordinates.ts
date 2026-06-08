import type { BubbleOffset, SeatAnchor, SeatPosition } from './seat-coordinates';

const ARC_START_DEG = -150;
const ARC_END_DEG = -30;
const ARC_CENTER_X = 50;
const ARC_CENTER_Y = 42;
const ARC_RADIUS_X = 38;
const ARC_RADIUS_Y = 28;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Opponent indices along top arc; hero is always last index after rotatePlayersForHero. */
function opponentArcPosition(opponentIndex: number, opponentCount: number): SeatPosition {
  if (opponentCount <= 1) {
    return { left: ARC_CENTER_X, top: 14, anchor: 'center' };
  }
  const t = opponentCount === 1 ? 0.5 : opponentIndex / (opponentCount - 1);
  const angleDeg = ARC_START_DEG + t * (ARC_END_DEG - ARC_START_DEG);
  const rad = degToRad(angleDeg);
  return {
    left: ARC_CENTER_X + ARC_RADIUS_X * Math.cos(rad),
    top: ARC_CENTER_Y + ARC_RADIUS_Y * Math.sin(rad),
    anchor: 'center'
  };
}

/** Portrait mobile seat layout — hero at bottom (off-table in immersive UI). */
export function mobileSeatCoordinates(index: number, total: number): SeatPosition {
  const heroIndex = total - 1;
  if (index === heroIndex) {
    return { left: 50, top: 88, anchor: 'bottom' };
  }

  const opponentCount = total - 1;
  const opponentIndex = index;

  if (total <= 2) {
    return { left: 50, top: 16, anchor: 'center' };
  }

  return opponentArcPosition(opponentIndex, opponentCount);
}

export function mobileSeatPositionStyle(
  index: number,
  total: number
): { left: string; top: string; transform: string } {
  const pos = mobileSeatCoordinates(index, total);
  const transform =
    pos.anchor === 'bottom' ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)';
  return {
    left: `${pos.left}%`,
    top: `${pos.top}%`,
    transform
  };
}

export function mobileBubbleOffset(index: number, total: number): BubbleOffset {
  const heroIndex = total - 1;
  if (index === heroIndex) {
    return { dx: 0, dy: -48, anchor: 'above' };
  }
  const pos = mobileSeatCoordinates(index, total);
  if (pos.top < ARC_CENTER_Y) {
    return { dx: 0, dy: 10, anchor: 'below' };
  }
  if (pos.left > ARC_CENTER_X + 8) {
    return { dx: -8, dy: 0, anchor: 'left' };
  }
  if (pos.left < ARC_CENTER_X - 8) {
    return { dx: 8, dy: 0, anchor: 'right' };
  }
  return { dx: 0, dy: 10, anchor: 'below' };
}

export function isHeroSeatIndex(index: number, total: number): boolean {
  return index === total - 1;
}

export type { SeatAnchor, SeatPosition, BubbleOffset };
