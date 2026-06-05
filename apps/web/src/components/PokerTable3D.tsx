import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Text } from '@react-three/drei';
import type { Card, EquippedCosmetics, SubscriptionTier } from '@duopoker/shared-types/index';
import { resolveEquipped } from '@duopoker/shared-types';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PlayerAvatar } from './cosmetics/PlayerAvatar';
import { PokerChipStack, PokerChipVisual } from './cosmetics/PokerChipVisual';

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
  heroChipId = 'chip_classic'
}: Props) {
  return (
    <div className="relative h-[22rem] w-full max-w-4xl overflow-hidden rounded-none bg-gradient-to-b from-[#0c1218] via-[#050508] to-black/90 sm:h-[26rem]">
      <Canvas camera={{ position: [0, 6.2, 7.5], fov: 36 }} dpr={[1, 2]} shadows className="!absolute inset-0">
        <color attach="background" args={['#050508']} />
        <ambientLight intensity={0.3} />
        <spotLight castShadow position={[4, 9, 5]} angle={0.45} penumbra={0.9} intensity={1.45} color="#f5e6a8" />
        <pointLight position={[-3, 4, 2]} intensity={0.28} color="#4ade80" />
        <Environment preset="night" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[3.15, 3.35, 0.12, 72]} />
          <meshStandardMaterial color="#0a2e1f" metalness={0.12} roughness={0.62} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[2.05, 2.55, 64]} />
          <meshStandardMaterial color="#e8c547" metalness={0.6} roughness={0.32} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={12} blur={2.5} far={5} />
        <Text position={[0, 0.35, -1.85]} fontSize={0.2} color="#e8c547" anchorX="center">
          Pot {pot.toLocaleString()}
        </Text>
        {street ? (
          <Text position={[0, 0.35, 1.85]} fontSize={0.15} color="#4ade80" anchorX="center">
            {street}
          </Text>
        ) : null}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute left-1/2 top-[38%] flex -translate-x-1/2 gap-1 sm:gap-1.5">
          {communityCards.map((c, i) => (
            <PlayingCard key={`${c}-${i}`} card={c} faceUp size="sm" deckId={heroDeckId} />
          ))}
        </div>

        <div className="absolute left-1/2 top-[52%] flex -translate-x-1/2 items-center gap-2 rounded-full border border-gold/20 bg-black/50 px-3 py-1 backdrop-blur-sm">
          <PokerChipVisual chipId={heroChipId} size="sm" />
          <span className="font-mono text-xs font-semibold text-gold-light">{pot.toLocaleString()}</span>
        </div>

        {players.map((player, index) => {
          const tier = player.tier ?? 'FREE';
          const equipped = resolveEquipped(player.equipped, tier);
          const deckId = equipped.deck;
          const cards = player.holeCards ?? [];
          return (
            <div
              key={player.userId}
              className={`absolute flex flex-col items-center gap-1.5 ${seatLayout(index, players.length)}`}
            >
              <PlayerAvatar
                name={player.name}
                avatarUrl={player.avatar}
                frameId={equipped.frame}
                tier={tier}
                active={player.isActive}
                folded={player.isFolded}
                size={index === players.length - 1 && players.length <= 2 ? 'lg' : 'md'}
                showTier={tier === 'ROYAL' || tier === 'PLATINUM'}
              />
              <div className="flex items-center gap-2">
                <PokerChipStack chipId={equipped.chip} count={Math.min(4, 2 + Math.floor(player.stack / 5000))} />
                <span className="rounded-lg border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-emerald">
                  {player.stack.toLocaleString()}
                </span>
              </div>
              {cards.length ? (
                <div className="flex gap-0.5 sm:gap-1">
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
