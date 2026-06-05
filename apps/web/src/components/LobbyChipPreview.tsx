import { Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { PlayingCard } from './cosmetics/PlayingCard';
import { PokerChipVisual } from './cosmetics/PokerChipVisual';

function StaticChipPreview() {
  return (
    <div className="flex h-36 w-full max-w-sm items-center justify-center gap-4 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-black/40 to-surface shadow-glow-gold">
      <PokerChipVisual chipId="chip_classic" size="lg" />
      <div className="flex gap-1">
        <PlayingCard faceUp={false} deckId="deck_classic" size="sm" />
        <PlayingCard faceUp={false} deckId="deck_classic" size="sm" />
      </div>
    </div>
  );
}

class ChipPreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <StaticChipPreview />;
    return this.props.children;
  }
}

function ChipCanvas() {
  return (
    <div className="h-36 w-full max-w-sm overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-black/40 to-surface shadow-glow-gold">
      <Canvas camera={{ position: [0, 1.2, 4.2], fov: 42 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color="#e8c547" />
        <pointLight position={[-3, 1, 2]} intensity={0.6} color="#4ade80" />
        <Float speed={2.2} rotationIntensity={0.35} floatIntensity={0.6}>
          <mesh rotation={[Math.PI / 2.2, 0.5, 0]} castShadow>
            <cylinderGeometry args={[1, 1, 0.28, 48]} />
            <meshStandardMaterial
              color="#e8c547"
              metalness={0.65}
              roughness={0.32}
              emissive="#1a1408"
              emissiveIntensity={0.25}
            />
          </mesh>
        </Float>
      </Canvas>
    </div>
  );
}

/** Lightweight 3D accent — table chip, with static fallback on WebGL failure. */
export default function LobbyChipPreview({ staticOnly = false }: { staticOnly?: boolean }) {
  if (staticOnly) return <StaticChipPreview />;
  return (
    <ChipPreviewBoundary>
      <ChipCanvas />
    </ChipPreviewBoundary>
  );
}

export { StaticChipPreview };
