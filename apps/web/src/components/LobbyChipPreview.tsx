import { Canvas } from '@react-three/fiber';
import { Float } from '@react-three/drei';

/** Lightweight 3D accent — table chip. */
export default function LobbyChipPreview() {
  return (
    <div className="h-36 w-full max-w-sm rounded-2xl border border-white/10 bg-black/20">
      <Canvas
        camera={{ position: [0, 1.2, 4.2], fov: 42 }}
        dpr={[1, 1.75]}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color="#ffd700" />
        <pointLight position={[-3, 1, 2]} intensity={0.6} color="#50c878" />
        <Float speed={2.2} rotationIntensity={0.35} floatIntensity={0.6}>
          <mesh rotation={[Math.PI / 2.2, 0.5, 0]} castShadow>
            <cylinderGeometry args={[1, 1, 0.28, 48]} />
            <meshStandardMaterial
              color="#c9a227"
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
