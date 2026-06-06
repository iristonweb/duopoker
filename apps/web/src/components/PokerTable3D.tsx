import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';
import { resolveEquipped, gameChipId } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { PokerChipStack, PokerChipVisual } from './cosmetics/PokerChipVisual';
import { isBotUserId, seatLayout } from '../lib/table-layout';
import { AnimatedPotDisplay } from './table/AnimatedPotDisplay';
import { tableFeltVisual } from '../lib/cosmetics-client';

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
  revealCards?: boolean;
  isActive?: boolean;
  isFolded?: boolean;
};

type Props = {
  communityCards: Card[];
  pot: number;
  street?: string;
  players?: TablePlayerVisual[];
  heroDeckId?: string;
  heroChipId?: string;
  heroTableFeltId?: string;
  /** Semi-transparent preview of cards that would have been dealt (subscription perk). */
  ghostCommunityCards?: Card[];
  className?: string;
};

export function PokerTable3D({
  communityCards,
  pot,
  street,
  players = [],
  heroDeckId = 'deck_classic',
  heroChipId = 'chip_classic',
  heroTableFeltId = 'table_classic',
  ghostCommunityCards = [],
  className
}: Props) {
  const felt = tableFeltVisual(heroTableFeltId);
  const potChipId = gameChipId(heroChipId);
  const showGhostBoard = ghostCommunityCards.length === 5;
  const boardCards = showGhostBoard ? ghostCommunityCards : communityCards;
  return (
    <div className={cn('relative h-full min-h-0 w-full overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_50%,_#000_100%)]" />

      <div className="pointer-events-none absolute inset-x-[4%] top-[8%] h-[78%] rounded-[50%] blur-3xl" style={{ background: `radial-gradient(ellipse at center, ${felt.ambientGlow} 0%, transparent 65%)` }} />

      <Canvas camera={{ position: [0, 7.2, 8.6], fov: 32 }} dpr={[1, 2]} shadows className="!absolute inset-0">
        <color attach="background" args={['#030305']} />
        <ambientLight intensity={0.28} />
        <spotLight
          castShadow
          position={[0, 11, 2]}
          angle={0.55}
          penumbra={0.92}
          intensity={2.1}
          color="#fff4cc"
        />
        <pointLight position={[-4, 4, 3]} intensity={0.22} color="#4ade80" />
        <pointLight position={[4, 4, 3]} intensity={0.18} color="#e8c547" />
        <Environment preset="night" />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <cylinderGeometry args={[3.55, 3.75, 0.22, 96]} />
          <meshStandardMaterial color="#2a1810" metalness={0.35} roughness={0.62} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <cylinderGeometry args={[3.15, 3.25, 0.12, 96]} />
          <meshStandardMaterial color={felt.meshColor} metalness={0.08} roughness={0.78} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[2.55, 3.05, 96]} />
          <meshStandardMaterial color={felt.rimColor} metalness={0.72} roughness={0.22} />
        </mesh>
        <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={14} blur={3.2} far={6} />
      </Canvas>

      <div
        className={cn(
          'pointer-events-none absolute left-1/2 top-[12%] h-[68%] w-[88%] max-w-[52rem] -translate-x-1/2 overflow-hidden rounded-[50%] border-[3px] shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]',
          felt.className,
          heroTableFeltId === 'table_void'
            ? 'border-violet-500/50 shadow-[inset_0_0_100px_rgba(88,28,135,0.45),0_0_56px_rgba(139,92,246,0.25)]'
            : 'border-[#8b6914]/80 shadow-[0_0_48px_rgba(232,197,71,0.15)]'
        )}
        style={{
          backgroundImage: felt.backgroundImage,
          backgroundSize: felt.backgroundSize
        }}
      >
        <div className="absolute inset-[10%] rounded-[50%] border border-white/[0.06]" />
        <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.38)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-[36%] flex -translate-x-1/2 gap-1.5 sm:gap-2.5">
          {boardCards.length ? (
            boardCards.map((c, i) => (
              <motion.div
                key={`${c}-${i}`}
                initial={{ opacity: 0, y: -16, rotateY: 90 }}
                animate={{ opacity: showGhostBoard ? 0.72 : 1, y: 0, rotateY: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
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
            ))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <PlayingCard
                key={`slot-${i}`}
                faceUp={false}
                size="sm"
                deckId={heroDeckId}
                className="border border-gold/15 opacity-50 sm:scale-110"
              />
            ))
          )}
        </div>

        <div className="absolute left-1/2 top-[50%] -translate-x-1/2">
          <AnimatedPotDisplay pot={pot} chipId={potChipId} street={street} />
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
          const isHeroSeat = index === players.length - 1 || (players.length <= 2 && index === 1);
          const roundBet = player.roundBet ?? 0;

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

              <p className="relative z-[1] max-w-[5.5rem] truncate text-center text-[10px] font-medium text-zinc-200 sm:max-w-[7rem] sm:text-xs">
                {player.name}
              </p>

              <div className="relative z-[1] flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/55 px-2 py-0.5 shadow-lg backdrop-blur-sm sm:px-2.5 sm:py-1">
                <PokerChipStack chipId={seatChipId} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <span className="font-mono text-[10px] font-semibold text-emerald">{player.stack.toLocaleString()}</span>
              </div>

              {roundBet > 0 ? (
                <motion.div
                  key={roundBet}
                  initial={{ scale: 0.6, y: 8, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  className="relative z-[1] flex items-center gap-1 rounded-full border border-gold/25 bg-black/50 px-2 py-0.5"
                >
                  <PokerChipVisual chipId={seatChipId} size="sm" className="scale-75" />
                  <span className="font-mono text-[9px] font-bold text-gold-light">{roundBet.toLocaleString()}</span>
                </motion.div>
              ) : null}

              {cards.length ? (
                <div className="relative z-[1] flex gap-0.5 sm:gap-1">
                  {cards.map((c, ci) => (
                    <PlayingCard
                      key={`${player.userId}-${ci}`}
                      card={c}
                      faceUp={Boolean(player.revealCards)}
                      deckId={deckId}
                      size={isHeroSeat ? 'md' : 'sm'}
                      className={cn(
                        'shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
                        isHeroSeat && ci === 0 && '-rotate-[8deg]',
                        isHeroSeat && ci === 1 && 'rotate-[8deg]'
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 75% 65% at 50% 45%, transparent 35%, rgba(5,5,8,0.55) 100%)'
        }}
      />
    </div>
  );
}
