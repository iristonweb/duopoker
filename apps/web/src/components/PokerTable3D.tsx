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
      ? 'left-1/2 top-[4%] -translate-x-1/2'
      : 'bottom-[6%] left-1/2 -translate-x-1/2';
  }
  const positions = [
    'left-1/2 top-[4%] -translate-x-1/2',
    'right-[8%] top-[28%]',
    'right-[10%] bottom-[28%]',
    'left-1/2 bottom-[6%] -translate-x-1/2',
    'left-[8%] bottom-[28%]',
    'left-[8%] top-[28%]'
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
        'relative w-full max-w-4xl overflow-hidden rounded-none',
        'bg-gradient-to-b from-[#0c1218] via-[#050508] to-black/95',
        'h-[24rem] sm:h-[30rem] lg:h-[32rem]',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(232,197,71,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(74,222,128,0.1), transparent 35%)'
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <span className="select-none font-display text-[8rem] text-gold sm:text-[10rem]" aria-hidden>
          ♠
        </span>
      </div>

      <Canvas camera={{ position: [0, 6.8, 8.2], fov: 34 }} dpr={[1, 2]} shadows className="!absolute inset-0">
        <color attach="background" args={['#050508']} />
        <ambientLight intensity={0.35} />
        <spotLight castShadow position={[4, 10, 5]} angle={0.42} penumbra={0.85} intensity={1.6} color="#f5e6a8" />
        <pointLight position={[-3, 5, 2]} intensity={0.35} color="#4ade80" />
        <pointLight position={[0, 8, -2]} intensity={0.2} color="#8b5cf6" />
        <Environment preset="night" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[3.25, 3.45, 0.14, 72]} />
          <meshStandardMaterial color="#0a2e1f" metalness={0.15} roughness={0.58} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
          <ringGeometry args={[2.1, 2.65, 64]} />
          <meshStandardMaterial color="#e8c547" metalness={0.65} roughness={0.28} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[1.85, 1.95, 64]} />
          <meshStandardMaterial color="#1a4d35" metalness={0.1} roughness={0.8} transparent opacity={0.5} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.6} scale={13} blur={2.8} far={5} />
        <Text position={[0, 0.38, -1.9]} fontSize={0.22} color="#e8c547" anchorX="center" fontWeight={600}>
          {pot.toLocaleString()}
        </Text>
        {street ? (
          <Text position={[0, 0.38, 1.9]} fontSize={0.14} color="#4ade80" anchorX="center">
            {street}
          </Text>
        ) : null}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-[36%] flex -translate-x-1/2 gap-1 sm:gap-1.5">
          {communityCards.length ? (
            communityCards.map((c, i) => (
              <PlayingCard
                key={`${c}-${i}`}
                card={c}
                faceUp
                size="sm"
                deckId={heroDeckId}
                className="transition-transform duration-300 hover:scale-105"
              />
            ))
          ) : (
            Array.from({ length: 5 }).map((_, i) => (
              <PlayingCard key={`slot-${i}`} faceUp={false} size="sm" deckId={heroDeckId} className="opacity-40" />
            ))
          )}
        </div>

        <div className="absolute left-1/2 top-[54%] flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/25 bg-black/55 px-4 py-1.5 shadow-glow-gold backdrop-blur-md">
          <PokerChipVisual chipId={heroChipId} size="sm" />
          <span className="font-mono text-xs font-semibold text-gold-light">{pot.toLocaleString()}</span>
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
                player.isActive && 'scale-105',
                player.isFolded && 'opacity-50'
              )}
            >
              {player.isActive ? (
                <span className="absolute -inset-3 rounded-2xl border border-emerald/40 bg-emerald/5 shadow-glow-emerald" />
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
              <div className="relative z-[1] flex items-center gap-2">
                <PokerChipStack chipId={equipped.chip} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <span className="rounded-lg border border-white/10 bg-black/50 px-2 py-0.5 font-mono text-[10px] text-emerald">
                  {player.stack.toLocaleString()}
                </span>
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
