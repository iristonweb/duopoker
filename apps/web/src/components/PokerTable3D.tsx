import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Text } from '@react-three/drei';
import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';
import { resolveEquipped } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { PokerChipStack, PokerChipVisual } from './cosmetics/PokerChipVisual';
import { isBotUserId } from '../lib/table-layout';

export type TablePlayerVisual = {
  userId: string;
  name: string;
  stack: number;
  avatar?: string | null;
  tier?: SubscriptionTier;
  equipped?: Partial<EquippedCosmetics>;
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
  className?: string;
};

const seatLayout = (index: number, total: number): string => {
  if (total <= 2) {
    return index === 0
      ? 'left-1/2 top-[6%] -translate-x-1/2'
      : 'bottom-[8%] left-1/2 -translate-x-1/2';
  }
  const positions = [
    'left-1/2 top-[5%] -translate-x-1/2',
    'right-[6%] top-[24%]',
    'right-[8%] bottom-[26%]',
    'left-1/2 bottom-[7%] -translate-x-1/2',
    'left-[6%] bottom-[26%]',
    'left-[6%] top-[24%]'
  ];
  return positions[index % positions.length] ?? positions[0];
};

export function PokerTable3D({
  communityCards,
  pot,
  street,
  players = [],
  heroDeckId = 'deck_classic',
  heroChipId = 'chip_classic',
  className
}: Props) {
  return (
    <div
      className={cn(
        'relative w-full max-w-5xl overflow-hidden',
        'h-[26rem] sm:h-[32rem] lg:h-[34rem]',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a1208_0%,_#050508_55%,_#000_100%)]" />

      <div className="pointer-events-none absolute inset-x-[8%] top-[10%] h-[72%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,_rgba(232,197,71,0.14)_0%,_transparent_62%)] blur-2xl" />

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
          <meshStandardMaterial color="#0d3d28" metalness={0.08} roughness={0.78} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[2.55, 3.05, 96]} />
          <meshStandardMaterial color="#c9a227" metalness={0.72} roughness={0.22} />
        </mesh>
        <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={14} blur={3.2} far={6} />
        <Text position={[0, 0.42, -2.05]} fontSize={0.2} color="#f5e6a8" anchorX="center" fontWeight={600}>
          {pot.toLocaleString()}
        </Text>
      </Canvas>

      <div
        className="pointer-events-none absolute left-1/2 top-[14%] h-[58%] w-[78%] max-w-[42rem] -translate-x-1/2 rounded-[50%] border-[3px] border-[#8b6914]/80 shadow-[inset_0_0_80px_rgba(0,0,0,0.55),0_0_40px_rgba(232,197,71,0.12)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 55%), url(/assets/table-felt.png)',
          backgroundSize: 'cover, 280px 280px'
        }}
      >
        <div className="absolute inset-[10%] rounded-[50%] border border-white/[0.06]" />
        <div className="absolute inset-0 rounded-[50%] bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.35)_100%)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 gap-1.5 sm:gap-2">
          {communityCards.length ? (
            communityCards.map((c, i) => (
              <PlayingCard
                key={`${c}-${i}`}
                card={c}
                faceUp
                size="sm"
                deckId={heroDeckId}
                className="shadow-[0_12px_32px_rgba(0,0,0,0.55)] transition-transform duration-300 hover:-translate-y-1"
              />
            ))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <PlayingCard
                key={`slot-${i}`}
                faceUp={false}
                size="sm"
                deckId={heroDeckId}
                className="opacity-35"
              />
            ))
          )}
        </div>

        <div className="absolute left-1/2 top-[52%] flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-gold/30 bg-black/60 px-5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_24px_rgba(232,197,71,0.15)] backdrop-blur-md">
          <PokerChipVisual chipId={heroChipId} size="sm" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/70">Pot</span>
            <span className="font-mono text-sm font-bold text-gold-light">{pot.toLocaleString()}</span>
          </div>
          {street ? (
            <span className="ml-1 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald">
              {street}
            </span>
          ) : null}
        </div>

        {players.map((player, index) => {
          const tier = player.tier ?? 'FREE';
          const equipped = resolveEquipped(player.equipped, tier);
          const deckId = equipped.deck;
          const cards = player.holeCards ?? [];
          const isHeroSeat = index === players.length - 1 || (players.length <= 2 && index === 1);
          return (
            <div
              key={player.userId}
              className={cn(
                'absolute flex flex-col items-center gap-1.5 transition-all duration-300',
                seatLayout(index, players.length),
                player.isActive && 'z-20 scale-[1.04]',
                player.isFolded && 'opacity-45 grayscale-[0.35]'
              )}
            >
              {player.isActive ? (
                <span className="absolute -inset-4 rounded-3xl border-2 border-emerald/50 bg-emerald/[0.07] shadow-[0_0_28px_rgba(74,222,128,0.35)]" />
              ) : null}
              <PlayerAvatar
                name={player.name}
                avatarUrl={player.avatar}
                frameId={equipped.frame}
                tier={tier}
                active={player.isActive}
                folded={player.isFolded}
                isBot={isBotUserId(player.userId)}
                size={isHeroSeat ? 'lg' : players.length > 4 ? 'sm' : 'md'}
                showTier={tier === 'ROYAL' || tier === 'PLATINUM'}
              />
              <div className="relative z-[1] flex items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-2.5 py-1 shadow-lg backdrop-blur-sm">
                <PokerChipStack chipId={equipped.chip} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <span className="font-mono text-[10px] font-semibold text-emerald">{player.stack.toLocaleString()}</span>
              </div>
              {cards.length ? (
                <div className="relative z-[1] flex gap-0.5 sm:gap-1">
                  {cards.map((c, ci) => (
                    <PlayingCard
                      key={`${player.userId}-${ci}`}
                      card={c}
                      faceUp={Boolean(player.revealCards)}
                      deckId={deckId}
                      size="sm"
                      className={cn(
                        'shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
                        isHeroSeat && ci === 0 && '-rotate-6',
                        isHeroSeat && ci === 1 && 'rotate-6'
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
