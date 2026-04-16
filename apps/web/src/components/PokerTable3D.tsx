import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, Float, Text } from '@react-three/drei';
import type { Card } from '@duopoker/shared-types/index';

type Props = {
  communityCards: Card[];
  pot: number;
  street?: string;
};

const cardLabel = (c: Card) => `${c[0]}${c[1] === 'H' ? '♥' : c[1] === 'D' ? '♦' : c[1] === 'C' ? '♣' : '♠'}`;

export function PokerTable3D({ communityCards, pot, street }: Props) {
  return (
    <div className="h-72 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0a1628] to-black/80">
      <Canvas camera={{ position: [0, 5.8, 7.2], fov: 38 }} dpr={[1, 2]} shadows>
        <color attach="background" args={['#05080f']} />
        <ambientLight intensity={0.35} />
        <spotLight
          castShadow
          position={[4, 9, 5]}
          angle={0.45}
          penumbra={0.9}
          intensity={1.35}
          color="#ffd88a"
        />
        <Environment preset="night" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[3.15, 3.35, 0.12, 72]} />
          <meshStandardMaterial color="#0c3d24" metalness={0.15} roughness={0.65} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[2.05, 2.55, 64]} />
          <meshStandardMaterial color="#c9a227" metalness={0.55} roughness={0.35} />
        </mesh>
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={12} blur={2.5} far={5} />

        {communityCards.map((c, i) => (
          <Float key={`${c}-${i}`} speed={1.6} rotationIntensity={0.08} floatIntensity={0.18}>
            <group position={[i * 0.62 - (communityCards.length * 0.62) / 2 + 0.31, 0.14, 0.2]}>
              <mesh castShadow rotation={[-Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.5, 0.72, 0.04]} />
                <meshStandardMaterial color="#f8f2e6" roughness={0.35} metalness={0.05} />
              </mesh>
              <Text
                position={[0, 0.06, 0.03]}
                fontSize={0.14}
                color="#1a1420"
                anchorX="center"
                anchorY="middle"
              >
                {cardLabel(c)}
              </Text>
            </group>
          </Float>
        ))}

        <Text position={[0, 0.35, -1.85]} fontSize={0.22} color="#c9a227" anchorX="center">
          Pot {pot}
        </Text>
        {street ? (
          <Text position={[0, 0.35, 1.85]} fontSize={0.16} color="#9ae6c9" anchorX="center">
            {street}
          </Text>
        ) : null}
      </Canvas>
    </div>
  );
}
