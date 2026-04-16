export function AppBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-radial-gold" />
      <div className="absolute inset-0 bg-radial-emerald opacity-80" />
      <div
        className="absolute -left-1/4 top-0 h-[70vh] w-[70vh] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vh] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(80,200,120,0.06) 0%, transparent 70%)'
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
    </div>
  );
}
