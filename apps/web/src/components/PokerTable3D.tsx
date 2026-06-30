import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';
import { resolveEquipped, gameChipId } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { PokerChipVisual } from './cosmetics/PokerChipVisual';
import { isBotUserId, bubbleOffset, timerOffset, seatPositionStyle, seatPositionStyleForPlayers, resolveSeatLayoutIndex, isBottomAnchoredSeat, feltPlayAreaClass, tableRailClass, tableCenterPercent, tableCenterTopStyle } from '../lib/table-layout';
import { AnimatedPotDisplay } from './table/AnimatedPotDisplay';
import { JokerTrickPile } from './table/JokerTrickPile';
import { SeatActionBubble } from './table/SeatActionBubble';
import { SeatStatusOverlay } from './table/SeatStatusOverlay';
import { SeatStackPill } from './table/SeatStackPill';
import { HoleCardsPeek } from './table/HoleCardsPeek';
import { TurnTimer } from './table/TurnTimer';
import { ChipFlightLayer } from './table/ChipFlightLayer';
import { tableFeltVisual } from '../lib/cosmetics-client';
import type { ChipFlight, JokerCardFlight, SeatActionBubble as SeatBubble } from '../hooks/useTableAnimationQueue';

export type TablePlayerVisual = {
  userId: string;
  name: string;
  stack: number;
  roundBet?: number;
  isDealer?: boolean;
  avatar?: string | null;
  tableStatus?: string | null;
  tier?: SubscriptionTier;
  equipped?: Partial<EquippedCosmetics>;
  inventory?: string[];
  holeCards?: Card[];
  /** Render N face-down cards when holeCards empty (opponent in hand). */
  hiddenCardCount?: number;
  revealCards?: boolean;
  isActive?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isWinner?: boolean;
  isHero?: boolean;
  /** JOKER: tricks won this hand */
  tricksWon?: number;
};

type Props = {
  communityCards: Card[];
  boardCardKeys?: string[];
  pot: number;
  street?: string;
  handNumber?: number;
  players?: TablePlayerVisual[];
  heroDeckId?: string;
  heroChipId?: string;
  heroTableFeltId?: string;
  ghostCommunityCards?: Card[];
  showBoardSlots?: boolean;
  seatBubbles?: SeatBubble[];
  chipFlights?: ChipFlight[];
  jokerFlights?: JokerCardFlight[];
  potPulseKey?: number;
  sidePots?: number[];
  foldingUsers?: string[];
  checkRippleUsers?: string[];
  activeUserId?: string;
  activeSecondsLeft?: number | null;
  deckShuffling?: boolean;
  className?: string;
};

export function PokerTable3D({
  communityCards,
  boardCardKeys,
  pot,
  street,
  handNumber = 0,
  players = [],
  heroDeckId = 'deck_classic',
  heroChipId = 'chip_classic',
  heroTableFeltId = 'table_classic',
  ghostCommunityCards = [],
  showBoardSlots = true,
  seatBubbles = [],
  chipFlights = [],
  jokerFlights = [],
  potPulseKey = 0,
  sidePots = [],
  checkRippleUsers = [],
  activeUserId,
  activeSecondsLeft = null,
  deckShuffling = false,
  className
}: Props) {
  const reduceMotion = useReducedMotion();
  const felt = tableFeltVisual(heroTableFeltId);
  const potChipId = gameChipId(heroChipId);
  const showGhostBoard = ghostCommunityCards.length === 5;
  const boardCards = showGhostBoard ? ghostCommunityCards : communityCards;
  const motionDelay = reduceMotion ? 0 : undefined;
  const playerIndex = new Map(players.map((p, i) => [p.userId, i]));
  const bubbleByUser = new Map(seatBubbles.map((b) => [b.userId, b]));

  return (
    <div
      data-testid="poker-table-surface"
      className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_50%,_#000_100%)]" />

      <div
        className="pointer-events-none absolute inset-x-[2%] top-[4%] z-[1] h-[88%] rounded-[50%] blur-3xl opacity-80"
        style={{ background: `radial-gradient(ellipse at center, ${felt.ambientGlow} 0%, transparent 70%)` }}
      />

      {/* Wooden rail */}
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
        <div
          className={cn('rounded-[50%]', tableRailClass)}
          style={{
            background:
              'linear-gradient(160deg, #5c3d24 0%, #3d2817 30%, #2a1810 55%, #1a1008 80%, #4a3020 100%)',
            boxShadow:
              '0 16px 56px rgba(0,0,0,0.7), inset 0 2px 20px rgba(255,220,160,0.1), inset 0 -6px 24px rgba(0,0,0,0.5)'
          }}
        />
      </div>

      {/* Felt surface */}
      <div
        className={cn(
          'pointer-events-none absolute z-[3] overflow-hidden rounded-[50%] border-[4px]',
          feltPlayAreaClass,
          felt.className,
          heroTableFeltId === 'table_void'
            ? 'border-violet-500/55 shadow-[0_0_56px_rgba(139,92,246,0.3),inset_0_0_80px_rgba(88,28,135,0.35)]'
            : heroTableFeltId === 'table_diamond'
              ? 'border-cyan-400/50 shadow-[0_0_48px_rgba(34,211,238,0.25),inset_0_0_70px_rgba(34,211,238,0.15)]'
              : heroTableFeltId === 'table_platinum'
                ? 'border-violet-300/45 shadow-[0_0_44px_rgba(196,181,253,0.2),inset_0_0_60px_rgba(167,139,250,0.15)]'
                : 'border-[#c9a227]/80 shadow-[0_0_64px_rgba(232,197,71,0.32),inset_0_0_50px_rgba(0,0,0,0.35)]'
        )}
        style={{
          backgroundColor: felt.meshColor,
          backgroundImage: felt.backgroundImage,
          backgroundSize: felt.backgroundSize
        }}
      >
        <div className="absolute inset-[8%] rounded-[50%] border border-white/[0.12]" />
        <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_50%_42%,_transparent_45%,_rgba(0,0,0,0.22)_100%)] max-table-compact:bg-[radial-gradient(ellipse_at_50%_42%,_transparent_50%,_rgba(0,0,0,0.18)_100%)]" />
      </div>

      <div className={cn('pointer-events-none z-20', feltPlayAreaClass, 'isolate')}>
        {deckShuffling ? (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[12%] z-[6] -translate-x-1/2"
            animate={
              !reduceMotion
                ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.08, 0.95, 1.05, 1], opacity: 1 }
                : { opacity: 0.85, scale: 1 }
            }
            transition={{ duration: reduceMotion ? 0.01 : 0.6, ease: 'easeInOut' }}
          >
            <div className="relative">
              <PlayingCard faceUp={false} size="sm" deckId={heroDeckId} className="shadow-[0_8px_24px_rgba(0,0,0,0.6)]" />
              <PlayingCard
                faceUp={false}
                size="sm"
                deckId={heroDeckId}
                className="absolute left-1 top-0.5 -rotate-6 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              />
            </div>
          </motion.div>
        ) : null}

        <ChipFlightLayer
          flights={chipFlights}
          playerIndex={playerIndex}
          playerCount={players.length}
          players={players}
          chipId={potChipId}
        />

        <div
          className="absolute left-1/2 z-board flex -translate-x-1/2 gap-0.5 max-table-compact:gap-2"
          style={tableCenterTopStyle('ring', 'boardTop')}
        >
          {boardCards.length ? (
            <AnimatePresence mode="popLayout">
              {boardCards.map((c, i) => (
                <motion.div
                  key={boardCardKeys?.[i] ?? `board-${i}-${c}`}
                  layout
                  initial={
                    reduceMotion
                      ? { opacity: 1, y: 0, scale: 1, rotateY: 0 }
                      : { opacity: 0, y: -36, scale: 0.55, rotateY: 0 }
                  }
                  animate={{ opacity: showGhostBoard ? 0.72 : 1, y: 0, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, y: 12, scale: 0.85, transition: { duration: 0.22 } }}
                  transition={{
                    delay: motionDelay ?? i * 0.1,
                    duration: reduceMotion ? 0.01 : 0.42,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                >
                  <PlayingCard
                    card={c}
                    faceUp
                    size="xs"
                    deckId={heroDeckId}
                    className={cn(
                      'shadow-[0_8px_20px_rgba(0,0,0,0.5)] max-table-compact:h-[4.5rem] max-table-compact:rounded-[0.45rem] md:scale-110',
                      showGhostBoard && 'ring-1 ring-violet-400/40 saturate-[0.85]'
                    )}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          ) : showBoardSlots ? (
            Array.from({ length: 5 }).map((_, i) => (
              <PlayingCard
                key={`slot-${i}`}
                faceUp={false}
                size="xs"
                deckId={heroDeckId}
                className="border border-gold/15 opacity-50 max-table-compact:h-[4.5rem] max-table-compact:rounded-[0.45rem] md:scale-110"
              />
            ))
          ) : null}
        </div>

        <div
          className="absolute left-1/2 z-pot -translate-x-1/2"
          style={tableCenterTopStyle('ring', 'potTop')}
        >
          <AnimatedPotDisplay
            pot={pot}
            chipId={potChipId}
            street={street}
            pulseKey={potPulseKey}
            sidePots={sidePots}
            className="scale-95 table-short:scale-90 max-table-compact:scale-100"
          />
        </div>

        {players.map((player, index) => {
          const layoutIndex = resolveSeatLayoutIndex(index, players);
          const tier = player.tier ?? 'FREE';
          const equipped =
            player.inventory && player.inventory.length > 0
              ? resolveEquipped(player.equipped, tier, player.inventory)
              : {
                  deck: player.equipped?.deck ?? 'deck_classic',
                  chip: player.equipped?.chip ?? 'chip_classic',
                  frame: player.equipped?.frame ?? 'frame_none',
                  title: player.equipped?.title ?? '',
                  table: player.equipped?.table ?? 'table_classic'
                };
          const deckId = equipped.deck;
          const seatChipId = gameChipId(equipped.chip);
          const cards = player.holeCards ?? [];
          const hiddenCount = player.hiddenCardCount ?? 0;
          const isHeroSeat = player.isHero === true;
          const roundBet = player.roundBet ?? 0;
          const bubble = bubbleByUser.get(player.userId);
          const hasCheckRipple = checkRippleUsers.includes(player.userId);

          const showTimer =
            !isHeroSeat &&
            player.isActive &&
            activeUserId === player.userId &&
            activeSecondsLeft !== null &&
            activeSecondsLeft > 0;
          const isBottomSeat = isBottomAnchoredSeat(layoutIndex, players.length);

          const avatarBlock = (
            <div
              className={cn(
                'relative flex w-full flex-col items-center transition-transform duration-300',
                player.isActive && 'scale-[1.03] max-table-compact:scale-[1.05]'
              )}
            >
              <div className="relative">
                <SeatStatusOverlay folded={player.isFolded} allIn={!player.isFolded && player.isAllIn} />
                {!isHeroSeat && (cards.length > 0 || hiddenCount > 0) ? (
                  <HoleCardsPeek
                    cards={cards}
                    hiddenCount={hiddenCount}
                    revealCards={player.revealCards}
                    deckId={deckId}
                    side="right"
                  />
                ) : null}

                <PlayerAvatar
                  name={player.name}
                  avatarUrl={player.avatar}
                  tableStatus={player.tableStatus}
                  frameId={equipped.frame}
                  tier={tier}
                  active={player.isActive}
                  folded={player.isFolded}
                  isBot={isBotUserId(player.userId)}
                  size={isHeroSeat ? 'md' : 'sm'}
                  className={cn(
                    isHeroSeat && 'max-table-compact:scale-110',
                    !isHeroSeat && 'table-compact:[&_.seat-status]:hidden'
                  )}
                  titleId={equipped.title}
                  showTier={tier === 'BLACK' || tier === 'DIAMOND' || tier === 'PLATINUM'}
                  hideName
                />
                {player.isDealer ? (
                  <span className="absolute -bottom-0.5 -right-0.5 z-[5] flex h-4 w-4 items-center justify-center rounded-full border border-gold/50 bg-[#1a1208]/90 text-[8px] font-bold text-gold-light shadow-glow-gold sm:h-5 sm:w-5 sm:text-[10px]">
                    D
                  </span>
                ) : null}
                {showTimer ? (
                  <div className={cn('absolute z-[6]', timerOffset(layoutIndex, players.length))}>
                    <TurnTimer secondsLeft={activeSecondsLeft!} size={40} className="opacity-95" />
                  </div>
                ) : null}
              </div>
            </div>
          );

          const stackBlock = (
            <SeatStackPill
              name={player.name}
              stack={player.stack}
              chipId={seatChipId}
              showName={!isHeroSeat}
              compact={!isHeroSeat}
              className={cn(isHeroSeat && '[body[data-table-layout-mode=mobile-classic]_&]:hidden')}
            />
          );

          const betBlock =
            roundBet > 0 ? (
              <motion.div
                key={`bet-${handNumber}-${player.userId}-${roundBet}`}
                initial={reduceMotion ? false : { scale: 0.6, y: 8, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.7 }}
                className={cn(
                  'relative z-[1] flex items-center gap-0.5',
                  'max-table-compact:glass-shine max-table-compact:gap-1 max-table-compact:rounded-full max-table-compact:border max-table-compact:border-gold/30 max-table-compact:bg-white/[0.04] max-table-compact:px-2 max-table-compact:py-0.5 max-table-compact:shadow-glow-gold max-table-compact:backdrop-blur-glass'
                )}
              >
                <PokerChipVisual chipId={seatChipId} size="sm" className="scale-75" />
                <span className="font-mono text-[9px] font-bold text-gold-light sm:text-[10px]">{roundBet.toLocaleString()}</span>
              </motion.div>
            ) : null;

          return (
            <div
              key={player.userId}
              className="absolute"
              style={seatPositionStyleForPlayers(index, players)}
            >
              <div
                className={cn(
                  'flex max-w-[5.5rem] flex-col items-center gap-0.5 max-table-compact:max-w-none max-table-compact:gap-1',
                  isHeroSeat && '[body[data-table-layout-mode=mobile-classic]_&]:hidden',
                  player.isFolded && 'opacity-50 grayscale-[0.4]',
                  player.isWinner && 'z-seatActive',
                  player.isActive && 'z-seatActive'
                )}
              >
                {player.isWinner ? (
                  <span className="absolute -inset-3 rounded-3xl border-2 border-gold/70 bg-gold/10 shadow-[0_0_40px_rgba(232,197,71,0.55)] max-table-compact:-inset-4" />
                ) : null}
                {player.isActive ? (
                  <>
                    <span className="pointer-events-none absolute -inset-2 animate-pulse-glow rounded-3xl border-2 border-emerald/55 bg-emerald/[0.08] shadow-[0_0_32px_rgba(74,222,128,0.4)] table-compact:-inset-3 max-table-compact:-inset-4" />
                    <span className="pointer-events-none absolute -inset-1 rounded-3xl border border-gold/25 table-compact:-inset-2 max-table-compact:-inset-3" />
                  </>
                ) : null}
                {hasCheckRipple ? (
                  <motion.span
                    initial={{ opacity: 0.7, scale: 0.85 }}
                    animate={{ opacity: 0, scale: 1.35 }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}
                    className="pointer-events-none absolute -inset-2 rounded-3xl border-2 border-emerald/60 max-table-compact:-inset-4"
                  />
                ) : null}
                {isHeroSeat ? (
                  <span className="pointer-events-none absolute -inset-2 rounded-3xl border border-gold/30 shadow-[inset_0_0_24px_rgba(232,197,71,0.14)]" />
                ) : null}

                {bubble ? (
                  <SeatActionBubble
                    text={bubble.text}
                    kind={bubble.kind}
                    className={bubbleOffset(layoutIndex, players.length)}
                  />
                ) : null}

                {isBottomSeat ? (
                  <>
                    {betBlock}
                    {stackBlock}
                    {avatarBlock}
                  </>
                ) : (
                  <>
                    {avatarBlock}
                    {stackBlock}
                    {betBlock}
                  </>
                )}

                {player.tricksWon !== undefined && player.tricksWon > 0 ? (
                  <JokerTrickPile
                    count={player.tricksWon}
                    deckId={deckId}
                    className="absolute -left-6 top-1/2 z-[1] -translate-y-1/2 sm:-left-8"
                  />
                ) : null}
              </div>
            </div>
          );
        })}

        <AnimatePresence>
          {jokerFlights.map((flight) => {
            const seatIdx = playerIndex.get(flight.userId);
            if (seatIdx === undefined) return null;
            const from = seatPositionStyle(resolveSeatLayoutIndex(seatIdx, players), players.length);
            const boardTop = `${tableCenterPercent('ring', 'jokerFlightTop')}%`;
            return (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, scale: 0.75, ...from }}
                animate={{ opacity: 1, scale: 1, left: '50%', top: boardTop, bottom: 'auto', transform: 'translate(-50%, -50%)' }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="absolute z-board"
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <PlayingCard card={flight.card} faceUp size="sm" deckId={heroDeckId} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[1] max-table-compact:opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 44%, transparent 42%, rgba(5,5,8,0.2) 100%)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-tableVignette h-6 bg-gradient-to-t from-[#050508]/30 to-transparent table-compact:h-5 max-table-compact:h-8"
        aria-hidden
      />
    </div>
  );
}
