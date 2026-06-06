import { AnimatePresence, motion } from 'framer-motion';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';
import type { ChipFlight } from '../../hooks/useTableAnimationQueue';

type Props = {
  flights: ChipFlight[];
  playerIndex: Map<string, number>;
  playerCount: number;
  chipId: string;
};

const seatAnchor = (index: number, total: number): { x: number; y: number } => {
  if (total <= 2) {
    return index === 0 ? { x: 50, y: 8 } : { x: 50, y: 92 };
  }
  const anchors = [
    { x: 50, y: 6 },
    { x: 92, y: 24 },
    { x: 90, y: 72 },
    { x: 50, y: 94 },
    { x: 10, y: 72 },
    { x: 10, y: 24 }
  ];
  return anchors[index % anchors.length] ?? anchors[0];
};

export function ChipFlightLayer({ flights, playerIndex, playerCount, chipId }: Props) {
  const pot = { x: 50, y: 50 };

  return (
    <div className="pointer-events-none absolute inset-0 z-[15]">
      <AnimatePresence>
        {flights.map((flight) => {
          const seatIdx = playerIndex.get(flight.userId);
          if (seatIdx === undefined) return null;
          const from = seatAnchor(seatIdx, playerCount);
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
