import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { mobileSeatCoordinates, seatCoordinates } from '@duopoker/table-client';
import type { SeatAnchor } from '@duopoker/table-client';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';
import type { ChipFlight } from '../../hooks/useTableAnimationQueue';

type Props = {
  flights: ChipFlight[];
  playerIndex: Map<string, number>;
  playerCount: number;
  chipId: string;
  /** `mobile-arc` matches portrait MobileTableSurface seat positions. */
  layout?: 'ring' | 'mobile-arc';
};

type FlightAnchor = { x: number; y: number; anchor: SeatAnchor };

const anchorOffset = (anchor: SeatAnchor) => (anchor === 'bottom' ? '-100%' : '-50%');

const sidePotAnchor = (potIndex: number, potCount: number): FlightAnchor => {
  const center = { x: 50, y: 52 };
  if (potCount <= 1) return { ...center, anchor: 'center' };
  const offsets = [
    { x: -10, y: -6 },
    { x: 10, y: -6 },
    { x: -10, y: 8 },
    { x: 10, y: 8 },
    { x: 0, y: -12 },
    { x: 0, y: 12 }
  ];
  const off = offsets[potIndex % offsets.length] ?? offsets[0]!;
  return { x: center.x + off.x, y: center.y + off.y, anchor: 'center' };
};

const seatAnchor = (index: number, total: number, layout: 'ring' | 'mobile-arc'): FlightAnchor => {
  const pos =
    layout === 'mobile-arc' ? mobileSeatCoordinates(index, total) : seatCoordinates(index, total);
  return { x: pos.left, y: pos.top, anchor: pos.anchor };
};

export function ChipFlightLayer({
  flights,
  playerIndex,
  playerCount,
  chipId,
  layout = 'ring'
}: Props) {
  const reduceMotion = useReducedMotion();
  const potCount = Math.max(1, ...flights.map((f) => (f.potIndex ?? 0) + 1));

  return (
    <div className="chip-flight-layer pointer-events-none absolute inset-0 z-chipFlight">
      <AnimatePresence>
        {flights.map((flight) => {
          const seatIdx = playerIndex.get(flight.userId);
          if (seatIdx === undefined) return null;
          const from = seatAnchor(seatIdx, playerCount, layout);
          const pot = sidePotAnchor(flight.potIndex ?? 0, potCount);
          const toPot = flight.kind === 'toPot';
          const fromPt = toPot ? from : pot;
          const toPt = toPot ? pot : from;
          const deltaX = toPt.x - fromPt.x;
          const deltaY = toPt.y - fromPt.y;

          return (
            <motion.div
              key={flight.id}
              initial={{
                opacity: 0,
                scale: 0.45,
                left: `${fromPt.x}%`,
                top: `${fromPt.y}%`,
                x: '-50%',
                y: anchorOffset(fromPt.anchor)
              }}
              animate={
                reduceMotion
                  ? { opacity: 0.85, scale: 1, x: '-50%', y: anchorOffset(fromPt.anchor) }
                  : {
                      opacity: [0, 1, 1, 0.85, 0],
                      scale: [0.45, 1, 1, 0.85, 0.5],
                      x: [`-50%`, `calc(-50% + ${deltaX}%)`],
                      y: [anchorOffset(fromPt.anchor), `calc(${anchorOffset(toPt.anchor)} + ${deltaY}%)`]
                    }
              }
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: reduceMotion ? 0.01 : 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="absolute will-change-transform"
            >
              <PokerChipVisual
                chipId={chipId}
                size="sm"
                className="drop-shadow-[0_4px_12px_rgba(232,197,71,0.45)]"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
