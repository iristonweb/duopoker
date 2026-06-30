import { AnimatePresence, motion } from 'framer-motion';
import type { Card } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { gameChipId, resolveEquipped } from '@duopoker/shared-types';
import {
  mobileBubbleOffset,
  mobileOpponentSeatPositionStyle,
  resolveSeatLayoutIndex
} from '@duopoker/table-client';
import { PlayingCard } from '../../../cosmetics/PlayingCard';
import { AnimatedPotDisplay } from '../../AnimatedPotDisplay';
import { ChipFlightLayer } from '../../ChipFlightLayer';
import type { TablePlayerVisual } from '../../../PokerTable3D';
import type { ChipFlight, SeatActionBubble } from '../../../../hooks/useTableAnimationQueue';
import { feltPlayAreaClass, tableRailClass, tableCenterTopStyle } from '../../../../lib/table-layout';
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
      className={cn('table-felt-immersive relative min-h-0 w-full flex-1 overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_55%,_#000_100%)]" />

      <div
        className="pointer-events-none absolute inset-0 z-[2]"
        aria-hidden
      >
        <div
          className={cn('rounded-[50%]', tableRailClass)}
          style={{
            background:
              'linear-gradient(160deg, #5c3d24 0%, #3d2817 30%, #2a1810 55%, #1a1008 80%, #4a3020 100%)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.65), inset 0 2px 16px rgba(255,220,160,0.08)'
          }}
        />
      </div>

      <div
        className={cn(
          'pointer-events-none absolute z-[3] overflow-hidden rounded-[50%] border-[3px] border-[#c9a227]/75',
          feltPlayAreaClass,
          felt.className
        )}
        style={{
          backgroundColor: felt.meshColor,
          backgroundImage: felt.backgroundImage,
          backgroundSize: felt.backgroundSize,
          boxShadow: '0 0 48px rgba(232,197,71,0.25), inset 0 0 40px rgba(0,0,0,0.4)'
        }}
      />

      <div className={cn('pointer-events-none absolute z-20', feltPlayAreaClass)}>
        {deckShuffling && !reduceMotion ? (
          <div className="pointer-events-none absolute left-1/2 top-[10%] z-[6] -translate-x-1/2">
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
          players={players}
          chipId={potChipId}
          layout="mobile-arc"
        />

        <div
          className="absolute left-1/2 z-board flex -translate-x-1/2 gap-0.5"
          style={tableCenterTopStyle('mobile-arc', 'boardTop')}
        >
          {boardCards.length ? (
            <AnimatePresence mode="popLayout">
              {boardCards.map((c, i) => (
                <motion.div
                  key={boardCardKeys?.[i] ?? `board-${i}-${c}`}
                  initial={reduceMotion ? false : { opacity: 0, y: -28, scale: 0.55 }}
                  animate={{ opacity: showGhostBoard ? 0.75 : 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <PlayingCard card={c} faceUp size="sm" deckId={heroDeckId} className="scale-90" />
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
                className="scale-90 opacity-40"
              />
            ))
          ) : null}
        </div>

        <div
          className="absolute left-1/2 z-pot -translate-x-1/2"
          style={tableCenterTopStyle('mobile-arc', 'potTop')}
        >
          {showCenterPot ? (
            <AnimatedPotDisplay
              pot={pot}
              chipId={potChipId}
              pulseKey={potPulseKey}
              sidePots={sidePots}
              className="scale-90 table-short:scale-[0.85]"
            />
          ) : null}
        </div>

        {players.map((player, index) => {
          if (player.isHero) return null;
          const opponentIndex = players.slice(0, index).filter((p) => !p.isHero).length;
          const opponentCount = players.filter((p) => !p.isHero).length;
          const layoutIndex = resolveSeatLayoutIndex(index, players);
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
              style={mobileOpponentSeatPositionStyle(opponentIndex, opponentCount)}
              className={cn(
                'absolute z-10',
                player.isWinner && 'z-seatActive',
                isFolding && 'opacity-60',
                hasRipple && 'rounded-full ring-2 ring-emerald/40'
              )}
            >
              <MobileSeatNode
                player={player}
                bubble={bubbleByUser.get(player.userId)}
                bubbleOffset={mobileBubbleOffset(layoutIndex, players.length)}
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
