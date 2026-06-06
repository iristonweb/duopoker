import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import type { PointLight } from 'three';
import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';
import { resolveEquipped, gameChipId } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { PokerChipStack, PokerChipVisual } from './cosmetics/PokerChipVisual';
import { isBotUserId, seatLayout } from '../lib/table-layout';
import { AnimatedPotDisplay } from './table/AnimatedPotDisplay';
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
  isHero?: boolean;
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
  dealTick?: number;
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
  dealTick = 0,
  className
}: Props) {
  const reduceMotion = useReducedMotion();
  const felt = tableFeltVisual(heroTableFeltId);
  const potChipId = gameChipId(heroChipId);
  const showGhostBoard = ghostCommunityCards.length === 5;
  const boardCards = showGhostBoard ? ghostCommunityCards : communityCards;
  const motionDelay = reduceMotion ? 0 : undefined;
  const playerIndex = new Map(players.map((p, i) => [p.userId, i]));
  const bubbleByUser = new Map(seatBubbles.map((b) => [b.userId, b.text]));

  return (
    <div className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_50%,_#000_100%)]" />

      <div
        className="pointer-events-none absolute inset-x-[4%] top-[8%] h-[78%] rounded-[50%] blur-3xl"
        style={{ background: `radial-gradient(ellipse at center, ${felt.ambientGlow} 0%, transparent 65%)` }}
      />

      <Canvas camera={{ position: [0, 7.2, 8.6], fov: 32 }} dpr={[1, 2]} shadows className="!absolute inset-0">
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
          'pointer-events-none absolute left-1/2 top-[12%] h-[68%] w-[88%] max-w-[52rem] -translate-x-1/2 overflow-hidden rounded-[50%] border-[3px] shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]',
          felt.className,
          heroTableFeltId === 'table_void'
            ? 'border-violet-500/50 shadow-[inset_0_0_100px_rgba(88,28,135,0.45),0_0_56px_rgba(139,92,246,0.25)]'
            : heroTableFeltId === 'table_diamond'
              ? 'border-cyan-400/45 shadow-[inset_0_0_90px_rgba(34,211,238,0.2),0_0_48px_rgba(34,211,238,0.18)]'
              : heroTableFeltId === 'table_platinum'
                ? 'border-violet-300/40 shadow-[inset_0_0_80px_rgba(167,139,250,0.18),0_0_44px_rgba(196,181,253,0.15)]'
                : 'border-[#8b6914]/80 shadow-[0_0_48px_rgba(232,197,71,0.15)]'
        )}
        style={{ backgroundImage: felt.backgroundImage, backgroundSize: felt.backgroundSize }}
      >
        <div className="absolute inset-[10%] rounded-[50%] border border-white/[0.06]" />
        <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.38)_100%)]" />
      </div>

      {/* Virtual deck position for deal animation origin */}
      <motion.div
        key={`deck-${handNumber}-${dealTick}`}
        className="pointer-events-none absolute left-1/2 top-[22%] z-[5] -translate-x-1/2 opacity-0"
        initial={reduceMotion ? false : { opacity: 0.6, scale: 1 }}
        animate={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.35 }}
      >
        <PlayingCard faceUp={false} size="sm" deckId={heroDeckId} />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <ChipFlightLayer
          flights={chipFlights}
          playerIndex={playerIndex}
          playerCount={players.length}
          chipId={potChipId}
        />

        <div className="absolute left-1/2 top-[36%] flex -translate-x-1/2 gap-1.5 sm:gap-2.5">
          {boardCards.length ? (
            <AnimatePresence mode="popLayout">
              {boardCards.map((c, i) => (
                <motion.div
                  key={boardCardKeys?.[i] ?? `h${handNumber}-board-${c}-${i}`}
                  layout
                  initial={
                    reduceMotion
                      ? { opacity: 1, y: 0, scale: 1, rotateY: 0 }
                      : { opacity: 0, y: -20, scale: 0.75, rotateY: 90 }
                  }
                  animate={{ opacity: showGhostBoard ? 0.72 : 1, y: 0, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, y: 12, scale: 0.85, transition: { duration: 0.22 } }}
                  transition={{ delay: motionDelay ?? i * 0.06, duration: 0.32, ease: 'easeOut' }}
                >
                  <PlayingCard
                    card={c}
                    faceUp
                    size="sm"
                    deckId={heroDeckId}
                    className={cn(
                      'shadow-[0_12px_32px_rgba(0,0,0,0.55)] sm:scale-110',
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
                size="sm"
                deckId={heroDeckId}
                className="border border-gold/15 opacity-50 sm:scale-110"
              />
            ))
          ) : null}
        </div>

        <div className="absolute left-1/2 top-[50%] -translate-x-1/2">
          <AnimatedPotDisplay pot={pot} chipId={potChipId} street={street} pulseKey={potPulseKey} />
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
          const bubbleText = bubbleByUser.get(player.userId);

          return (
            <div
              key={player.userId}
              className={cn(
                'absolute flex flex-col items-center gap-1 transition-all duration-300',
                seatLayout(index, players.length),
                player.isActive && 'z-20 scale-[1.05]',
                player.isFolded && 'opacity-45 grayscale-[0.35]'
              )}
            >
              {player.isActive ? (
                <span className="absolute -inset-3 animate-pulse-glow rounded-3xl border-2 border-emerald/50 bg-emerald/[0.07] shadow-[0_0_28px_rgba(74,222,128,0.35)] sm:-inset-4" />
              ) : null}
              {isHeroSeat ? (
                <span className="absolute -inset-2 rounded-3xl border border-gold/25 shadow-[inset_0_0_20px_rgba(232,197,71,0.12)]" />
              ) : null}

              {bubbleText ? <SeatActionBubble text={bubbleText} /> : null}

              {player.isDealer ? (
                <span className="absolute -right-1 -top-1 z-[2] flex h-5 w-5 items-center justify-center rounded-full border border-gold/40 bg-gold/20 text-[10px] font-bold text-gold-light shadow-glow-gold">
                  D
                </span>
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
                size={isHeroSeat ? 'lg' : players.length > 4 ? 'sm' : 'md'}
                titleId={equipped.title}
                showTier={tier === 'BLACK' || tier === 'DIAMOND' || tier === 'PLATINUM'}
              />

              <div className="glass-shine relative z-[1] flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-2 py-0.5 shadow-panel backdrop-blur-glass sm:px-2.5 sm:py-1">
                <PokerChipStack chipId={seatChipId} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <span className="font-mono text-[10px] font-semibold text-emerald">{player.stack.toLocaleString()}</span>
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
                <div className="relative z-[1] flex gap-0.5 sm:gap-1">
                  <AnimatePresence mode="popLayout">
                    {(cards.length ? cards : Array.from({ length: hiddenCount })).map((c, ci) => (
                      <motion.div
                        key={`h${handNumber}-seat-${player.userId}-${ci}`}
                        layout
                        initial={
                          reduceMotion
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { opacity: 0, y: -28, x: 0, scale: 0.75, rotate: -6 }
                        }
                        animate={{ opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, y: -18, scale: 0.7, transition: { duration: 0.25 } }}
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
                          size={isHeroSeat ? 'md' : 'sm'}
                          className="shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
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
    </div>
  );
}
