import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { PointLight } from 'three';
import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';
import { resolveEquipped, gameChipId } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { PokerChipStack, PokerChipVisual } from './cosmetics/PokerChipVisual';
import { isBotUserId, bubbleOffset, seatLayout, feltPlayAreaClass } from '../lib/table-layout';
import { AnimatedPotDisplay } from './table/AnimatedPotDisplay';
import { JokerTrickPile } from './table/JokerTrickPile';
import { SeatActionBubble } from './table/SeatActionBubble';
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
  className?: string;
};

function RimLightSweep({ color }: { color: string }) {
  const lightRef = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.12 + Math.sin(clock.elapsedTime * 0.55) * 0.08;
    }
  });
  return <pointLight ref={lightRef} position={[0, 2.5, 0]} intensity={0.12} color={color} />;
}

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
  foldingUsers = [],
  checkRippleUsers = [],
  className
}: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const felt = tableFeltVisual(heroTableFeltId);
  const potChipId = gameChipId(heroChipId);
  const showGhostBoard = ghostCommunityCards.length === 5;
  const boardCards = showGhostBoard ? ghostCommunityCards : communityCards;
  const motionDelay = reduceMotion ? 0 : undefined;
  const playerIndex = new Map(players.map((p, i) => [p.userId, i]));
  const bubbleByUser = new Map(seatBubbles.map((b) => [b.userId, b]));
  const foldingSet = new Set(foldingUsers);

  return (
    <div className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_50%,_#000_100%)]" />

      <div
        className="pointer-events-none absolute inset-x-[4%] top-[8%] h-[78%] rounded-[50%] blur-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${felt.ambientGlow} 0%, transparent 65%)` }}
      />

      {/* Static table rim on compact viewports — no WebGL */}
      <div className="pointer-events-none absolute inset-0 max-table-compact:hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#030305]" />
        <div
          className="absolute left-1/2 top-[42%] h-[52%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            background: `radial-gradient(ellipse at center, ${felt.meshColor} 0%, #1a1208 70%)`,
            boxShadow: `0 0 48px ${felt.rimColor}55, inset 0 0 72px rgba(0,0,0,0.65)`
          }}
        />
        <div
          className="absolute left-1/2 top-[42%] h-[56%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-[3px]"
          style={{ borderColor: `${felt.rimColor}99` }}
        />
      </div>

      <Canvas
        camera={{ position: [0, 7.2, 8.6], fov: 32 }}
        dpr={[1, 1.5]}
        shadows
        className="!absolute inset-0 hidden max-table-compact:block"
      >
        <color attach="background" args={['#030305']} />
        <ambientLight intensity={0.28} />
        <spotLight castShadow position={[0, 11, 2]} angle={0.55} penumbra={0.92} intensity={2.1} color="#fff4cc" />
        <pointLight position={[-4, 4, 3]} intensity={0.22} color="#4ade80" />
        <pointLight position={[4, 4, 3]} intensity={0.18} color="#e8c547" />
        {!reduceMotion ? <RimLightSweep color={felt.rimColor} /> : null}
        <Environment preset="night" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <cylinderGeometry args={[3.55, 3.75, 0.22, 96]} />
          <meshStandardMaterial color="#2a1810" metalness={0.45} roughness={0.58} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[3.15, 3.25, 0.12, 96]} />
          <meshStandardMaterial color={felt.meshColor} metalness={0.12} roughness={0.74} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[2.55, 3.05, 96]} />
          <meshStandardMaterial color={felt.rimColor} metalness={0.78} roughness={0.18} />
        </mesh>
        <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={14} blur={3.2} far={6} />
      </Canvas>

      <div
        className={cn(
          'pointer-events-none overflow-visible rounded-[50%] border-[3px] shadow-[inset_0_0_100px_rgba(0,0,0,0.65),inset_0_4px_24px_rgba(232,197,71,0.08)]',
          feltPlayAreaClass,
          felt.className,
          heroTableFeltId === 'table_void'
            ? 'border-violet-500/50 shadow-[inset_0_0_100px_rgba(88,28,135,0.45),0_0_56px_rgba(139,92,246,0.25)]'
            : heroTableFeltId === 'table_diamond'
              ? 'border-cyan-400/45 shadow-[inset_0_0_90px_rgba(34,211,238,0.2),0_0_48px_rgba(34,211,238,0.18)]'
              : heroTableFeltId === 'table_platinum'
                ? 'border-violet-300/40 shadow-[inset_0_0_80px_rgba(167,139,250,0.18),0_0_44px_rgba(196,181,253,0.15)]'
                : 'border-[#c9a227]/70 shadow-[0_0_64px_rgba(232,197,71,0.22),inset_0_0_60px_rgba(0,0,0,0.5)]'
        )}
        style={{ backgroundImage: felt.backgroundImage, backgroundSize: felt.backgroundSize }}
      >
        <div className="absolute inset-[10%] rounded-[50%] border border-white/[0.08]" />
        <div className="absolute inset-[6%] rounded-[50%] border border-gold/10" />
        <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_center,_transparent_35%,_rgba(0,0,0,0.42)_100%)]" />
      </div>

      {/* Virtual deck position for deal animation origin */}
      <motion.div
        key={`deck-${handNumber}`}
        className="pointer-events-none absolute left-1/2 top-[22%] z-[5] -translate-x-1/2 opacity-0"
        initial={reduceMotion ? false : { opacity: 0.6, scale: 1 }}
        animate={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.35 }}
      >
        <PlayingCard faceUp={false} size="sm" deckId={heroDeckId} />
      </motion.div>

      <div className={cn('pointer-events-none z-10', feltPlayAreaClass)}>
        <ChipFlightLayer
          flights={chipFlights}
          playerIndex={playerIndex}
          playerCount={players.length}
          chipId={potChipId}
        />

        <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 gap-0.5 max-table-compact:top-[40%] max-table-compact:gap-2">
          {boardCards.length ? (
            <AnimatePresence mode="popLayout">
              {boardCards.map((c, i) => (
                <motion.div
                  key={boardCardKeys?.[i] ?? `board-${i}-${c}`}
                  layout
                  initial={
                    reduceMotion
                      ? { opacity: 1, y: 0, scale: 1, rotateY: 0 }
                      : false
                  }
                  animate={{ opacity: showGhostBoard ? 0.72 : 1, y: 0, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, y: 12, scale: 0.85, transition: { duration: 0.22 } }}
                  transition={{ delay: motionDelay ?? i * 0.06, duration: 0.32, ease: 'easeOut' }}
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

        <div className="absolute left-1/2 top-[52%] hidden -translate-x-1/2 md:block">
          <AnimatedPotDisplay
            pot={pot}
            chipId={potChipId}
            street={street}
            pulseKey={potPulseKey}
            sidePots={sidePots}
          />
        </div>

        {players.map((player, index) => {
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
          const isHeroSeat = player.isHero ?? index === players.length - 1;
          const roundBet = player.roundBet ?? 0;
          const bubble = bubbleByUser.get(player.userId);
          const isFolding = foldingSet.has(player.userId);
          const hasCheckRipple = checkRippleUsers.includes(player.userId);

          return (
            <div
              key={player.userId}
              className={cn(
                'absolute flex max-w-[5.5rem] flex-col items-center gap-0.5 transition-all duration-300 max-table-compact:max-w-none max-table-compact:gap-1',
                seatLayout(index, players.length),
                player.isActive && 'z-20 scale-[1.03] max-table-compact:scale-[1.05]',
                player.isFolded && 'opacity-50 grayscale-[0.4]'
              )}
            >
              {player.isActive ? (
                <>
                  <span className="absolute -inset-2 animate-pulse-glow rounded-3xl border-2 border-emerald/55 bg-emerald/[0.08] shadow-[0_0_32px_rgba(74,222,128,0.4)] max-table-compact:-inset-5" />
                  <span className="absolute -inset-1 rounded-3xl border border-gold/25 max-table-compact:-inset-3" />
                </>
              ) : null}
              {hasCheckRipple ? (
                <motion.span
                  initial={{ opacity: 0.7, scale: 0.85 }}
                  animate={{ opacity: 0, scale: 1.35 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="absolute -inset-2 rounded-3xl border-2 border-emerald/60 max-table-compact:-inset-4"
                />
              ) : null}
              {isHeroSeat ? (
                <span className="absolute -inset-2 rounded-3xl border border-gold/30 shadow-[inset_0_0_24px_rgba(232,197,71,0.14)]" />
              ) : null}

              {bubble ? (
                <SeatActionBubble
                  text={bubble.text}
                  kind={bubble.kind}
                  className={bubbleOffset(index, players.length)}
                />
              ) : null}

              {player.isFolded ? (
                <span className="absolute -bottom-1 z-[4] rounded-full border border-rose/40 bg-rose/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-rose sm:text-[9px]">
                  {t('table.seatOut')}
                </span>
              ) : player.isAllIn ? (
                <span className="absolute -bottom-1 z-[4] rounded-full border border-rose/50 bg-rose/25 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-rose sm:text-[9px]">
                  {t('table.seatAllIn')}
                </span>
              ) : null}

              {player.isDealer ? (
                <span className="absolute -right-1 -top-1 z-[2] flex h-4 w-4 items-center justify-center rounded-full border border-gold/40 bg-gold/20 text-[8px] font-bold text-gold-light shadow-glow-gold sm:h-5 sm:w-5 sm:text-[10px]">
                  D
                </span>
              ) : null}

              {player.tricksWon !== undefined && player.tricksWon > 0 ? (
                <JokerTrickPile
                  count={player.tricksWon}
                  deckId={deckId}
                  className="absolute -left-6 top-1/2 z-[1] -translate-y-1/2 sm:-left-8"
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
                  !isHeroSeat &&
                    'table-compact:[&_.seat-name]:hidden table-compact:[&_.seat-status]:hidden table-compact:[&_img[alt=""]]:mt-0'
                )}
                titleId={equipped.title}
                showTier={tier === 'BLACK' || tier === 'DIAMOND' || tier === 'PLATINUM'}
              />

              <div className="glass-shine relative z-[1] flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.04] px-1.5 py-0.5 shadow-panel backdrop-blur-glass max-sm:px-1.5 sm:gap-1.5 sm:px-2.5 sm:py-1">
                <PokerChipStack chipId={seatChipId} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <span className="font-mono text-[8px] font-semibold text-emerald sm:text-[10px]">{player.stack.toLocaleString()}</span>
              </div>

              {roundBet > 0 ? (
                <motion.div
                  key={`bet-${handNumber}-${player.userId}-${roundBet}`}
                  initial={reduceMotion ? false : { scale: 0.6, y: 8, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.7 }}
                  className="glass-shine relative z-[1] flex items-center gap-1 rounded-full border border-gold/30 bg-white/[0.04] px-2 py-0.5 shadow-glow-gold backdrop-blur-glass"
                >
                  <PokerChipVisual chipId={seatChipId} size="sm" className="scale-75" />
                  <span className="font-mono text-[9px] font-bold text-gold-light">{roundBet.toLocaleString()}</span>
                </motion.div>
              ) : null}

              {cards.length || hiddenCount > 0 ? (
                <>
                  {!isHeroSeat && !cards.length && hiddenCount > 0 ? (
                    <div className="relative z-[1] hidden table-compact:flex">
                      <span className="rounded-full border border-white/15 bg-black/55 px-1.5 py-0.5 font-mono text-[9px] font-bold text-gold-light backdrop-blur-sm">
                        {t('table.hiddenCards', { count: hiddenCount })}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'relative z-[1] flex gap-0.5 max-table-compact:gap-1',
                      isHeroSeat && 'max-table-compact:hidden',
                      !isHeroSeat && !cards.length && hiddenCount > 0 && 'hidden max-table-compact:flex'
                    )}
                  >
                  <AnimatePresence mode="popLayout">
                    {(cards.length ? cards : Array.from({ length: hiddenCount })).map((c, ci) => (
                      <motion.div
                        key={`seat-${player.userId}-${ci}`}
                        layout
                        initial={
                          reduceMotion
                            ? { opacity: 1, y: 0, scale: 1 }
                            : false
                        }
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }}
                        exit={
                          isFolding
                            ? { opacity: 0, y: 28, scale: 0.6, rotate: 12, transition: { duration: 0.4 } }
                            : { opacity: 0, y: -18, scale: 0.7, transition: { duration: 0.25 } }
                        }
                        transition={{ delay: motionDelay ?? ci * 0.05, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          isHeroSeat && ci === 0 && '-rotate-[8deg]',
                          isHeroSeat && ci === 1 && 'rotate-[8deg]'
                        )}
                      >
                        <PlayingCard
                          card={typeof c === 'object' && c ? c : undefined}
                          faceUp={Boolean(player.revealCards && typeof c === 'object' && c)}
                          deckId={deckId}
                          size="sm"
                          className="scale-[0.85] shadow-[0_8px_24px_rgba(0,0,0,0.5)] max-table-compact:scale-100"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}

        <AnimatePresence>
          {jokerFlights.map((flight) => {
            const seatIdx = playerIndex.get(flight.userId);
            if (seatIdx === undefined) return null;
            return (
              <motion.div
                key={flight.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={cn('absolute z-[18]', seatLayout(seatIdx, players.length))}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              >
                <motion.div
                  initial={{ y: 0, x: 0 }}
                  animate={{ y: '-18vh', x: '0vw' }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <PlayingCard card={flight.card} faceUp size="sm" deckId={heroDeckId} />
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 35%, rgba(5,5,8,0.55) 100%)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[11] h-10 bg-gradient-to-t from-[#050508]/90 via-[#050508]/40 to-transparent table-compact:h-8 max-table-compact:h-12 max-table-compact:opacity-60"
        aria-hidden
      />
    </div>
  );
}
