import { AnimatePresence, motion } from 'framer-motion';
import type { Card } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { gameChipId, resolveEquipped } from '@duopoker/shared-types';
import {
  isHeroSeatIndex,
  mobileBubbleOffset,
  mobileSeatPositionStyle
} from '@duopoker/table-client';
import { PlayingCard } from '../../../cosmetics/PlayingCard';
import { AnimatedPotDisplay } from '../../AnimatedPotDisplay';
import { ChipFlightLayer } from '../../ChipFlightLayer';
import type { TablePlayerVisual } from '../../../PokerTable3D';
import type { ChipFlight, SeatActionBubble } from '../../../../hooks/useTableAnimationQueue';
import { tableFeltVisual } from '../../../../lib/cosmetics-client';
import { MobileSeatNode } from './MobileSeatNode';

type Props = {
  communityCards: Card[];
  boardCardKeys?: string[];
  pot: number;
  street?: string;
  players: TablePlayerVisual[];
  heroDeckId: string;
  heroChipId: string;
  heroTableFeltId: string;
  seatBubbles: SeatActionBubble[];
  chipFlights: ChipFlight[];
  potPulseKey: number;
  sidePots: number[];
  showCenterPot?: boolean;
  showBoardSlots?: boolean;
  ghostCommunityCards?: Card[];
  foldingUsers?: string[];
  checkRippleUsers?: string[];
  activeUserId?: string;
  secondsLeft?: number | null;
  deckShuffling?: boolean;
  onAvatarTap?: (userId: string) => void;
  reduceMotion?: boolean;
  className?: string;
};

export function MobileTableSurface({
  communityCards,
  boardCardKeys,
  pot,
  players,
  heroDeckId,
  heroChipId,
  heroTableFeltId,
  seatBubbles,
  chipFlights,
  potPulseKey,
  sidePots,
  showCenterPot = true,
  showBoardSlots = true,
  ghostCommunityCards = [],
  secondsLeft = null,
  activeUserId,
  deckShuffling = false,
  foldingUsers = [],
  checkRippleUsers = [],
  onAvatarTap,
  reduceMotion,
  className
}: Props) {
  const felt = tableFeltVisual(heroTableFeltId);
  const potChipId = gameChipId(heroChipId);
  const showGhostBoard = ghostCommunityCards.length === 5;
  const boardCards = showGhostBoard ? ghostCommunityCards : communityCards;
  const bubbleByUser = new Map(seatBubbles.map((b) => [b.userId, b]));
  const playerIndex = new Map(players.map((p, i) => [p.userId, i]));
  const foldingSet = new Set(foldingUsers);
  const rippleSet = new Set(checkRippleUsers);

  return (
    <div
      data-testid="mobile-table-surface"
      className={cn('table-felt-immersive relative min-h-0 w-full flex-1 overflow-visible', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_55%,_#000_100%)]" />
      <div
        className="absolute left-1/2 top-[6%] h-[58%] w-[88%] max-w-[24rem] -translate-x-1/2 rounded-[50%]"
        style={{
          background: `radial-gradient(ellipse at center, ${felt.meshColor} 0%, #1a1208 70%)`,
          boxShadow: `0 0 32px ${felt.rimColor}44, inset 0 0 48px rgba(0,0,0,0.6)`
        }}
      />
      <div
        className={cn(
          'absolute left-1/2 top-[6%] h-[58%] w-[88%] max-w-[24rem] -translate-x-1/2 rounded-[50%] border-2',
          felt.className
        )}
        style={{ borderColor: `${felt.rimColor}88` }}
      />

      <div className="absolute left-1/2 top-[22%] h-[42%] w-[78%] max-w-[20rem] -translate-x-1/2">
        {deckShuffling && !reduceMotion ? (
          <div className="pointer-events-none absolute left-1/2 top-[8%] z-[6] -translate-x-1/2">
            <div className="relative animate-pulse">
              <PlayingCard faceUp={false} size="sm" deckId={heroDeckId} />
              <PlayingCard
                faceUp={false}
                size="sm"
                deckId={heroDeckId}
                className="absolute left-1 top-0.5 -rotate-6"
              />
            </div>
          </div>
        ) : null}

        <ChipFlightLayer
          flights={chipFlights}
          playerIndex={playerIndex}
          playerCount={players.length}
          chipId={potChipId}
          layout="mobile-arc"
        />

        <div className="absolute left-[44%] top-[38%] flex -translate-x-1/2 gap-1">
          {boardCards.length ? (
            <AnimatePresence mode="popLayout">
              {boardCards.map((c, i) => (
                <motion.div
                  key={boardCardKeys?.[i] ?? `board-${i}-${c}`}
                  initial={reduceMotion ? false : { opacity: 0, y: -28, scale: 0.55 }}
                  animate={{ opacity: showGhostBoard ? 0.75 : 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <PlayingCard card={c} faceUp size="sm" deckId={heroDeckId} />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : showBoardSlots ? (
            Array.from({ length: 5 }).map((_, i) => (
              <PlayingCard
                key={`slot-${i}`}
                faceUp={false}
                size="sm"
                deckId={heroDeckId}
                className="opacity-40"
              />
            ))
          ) : null}
        </div>

        <div className="absolute left-1/2 top-[8%] z-[12] -translate-x-1/2">
          {showCenterPot ? (
            <AnimatedPotDisplay
              pot={pot}
              chipId={potChipId}
              pulseKey={potPulseKey}
              sidePots={sidePots}
              className="scale-90"
            />
          ) : null}
        </div>

        {players.map((player, index) => {
          if (isHeroSeatIndex(index, players.length)) return null;
          const equipped =
            player.inventory && player.inventory.length > 0
              ? resolveEquipped(player.equipped, player.tier ?? 'FREE', player.inventory)
              : {
                  deck: player.equipped?.deck ?? 'deck_classic',
                  chip: player.equipped?.chip ?? 'chip_classic',
                  frame: player.equipped?.frame ?? 'frame_none',
                  title: player.equipped?.title ?? '',
                  table: player.equipped?.table ?? 'table_classic'
                };
          const seatSeconds =
            player.isActive && player.userId === activeUserId ? secondsLeft : null;
          const isFolding = foldingSet.has(player.userId);
          const hasRipple = rippleSet.has(player.userId);

          return (
            <div
              key={player.userId}
              style={mobileSeatPositionStyle(index, players.length)}
              className={cn(
                'absolute z-10',
                player.isWinner && 'z-[12]',
                isFolding && 'opacity-60',
                hasRipple && 'ring-2 ring-emerald/40 rounded-full'
              )}
            >
              <MobileSeatNode
                player={player}
                bubble={bubbleByUser.get(player.userId)}
                bubbleOffset={mobileBubbleOffset(index, players.length)}
                secondsLeft={seatSeconds}
                chipId={gameChipId(equipped.chip)}
                deckId={equipped.deck}
                onAvatarTap={onAvatarTap}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
