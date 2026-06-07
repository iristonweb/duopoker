import { AnimatePresence, motion } from 'framer-motion';
import { seatCoordinates } from '@duopoker/table-client';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';
import type { ChipFlight } from '../../hooks/useTableAnimationQueue';

type Props = {
  flights: ChipFlight[];
  playerIndex: Map<string, number>;
  playerCount: number;
  chipId: string;
};

const sidePotAnchor = (potIndex: number, potCount: number): { x: number; y: number } => {
  const center = { x: 50, y: 52 };
  if (potCount <= 1) return center;
  const offsets = [
    { x: -10, y: -6 },
    { x: 10, y: -6 },
    { x: -10, y: 8 },
    { x: 10, y: 8 },
    { x: 0, y: -12 },
    { x: 0, y: 12 }
  ];
  const off = offsets[potIndex % offsets.length] ?? offsets[0]!;
  return { x: center.x + off.x, y: center.y + off.y };
};

const seatAnchor = (index: number, total: number): { x: number; y: number } => {
  const pos = seatCoordinates(index, total);
  return { x: pos.left, y: pos.top };
};

export function ChipFlightLayer({ flights, playerIndex, playerCount, chipId }: Props) {
  const potCount = Math.max(1, ...flights.map((f) => (f.potIndex ?? 0) + 1));

  return (
    <div className="pointer-events-none absolute inset-0 z-[15]">
      <AnimatePresence>
        {flights.map((flight) => {
          const seatIdx = playerIndex.get(flight.userId);
          if (seatIdx === undefined) return null;
          const from = seatAnchor(seatIdx, playerCount);
          const pot = sidePotAnchor(flight.potIndex ?? 0, potCount);
          const toPot = flight.kind === 'toPot';
          const fromPt = toPot ? from : pot;
          const toPt = toPot ? pot : from;

          return (
            <motion.div
              key={flight.id}
              initial={{
                opacity: 0,
                scale: 0.45,
                left: `${fromPt.x}%`,
                top: `${fromPt.y}%`,
                x: '-50%',
                y: '-50%'
              }}
              animate={{
                opacity: [0, 1, 1, 0.85, 0],
                scale: [0.45, 1, 1, 0.85, 0.5],
                left: [`${fromPt.x}%`, `${toPt.x}%`],
                top: [`${fromPt.y}%`, `${toPt.y}%`]
              }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
              className="absolute"
            >
              <PokerChipVisual chipId={chipId} size="sm" className="drop-shadow-[0_4px_12px_rgba(232,197,71,0.45)]" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
