export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-mesh-premium opacity-80" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.14]"
        style={{ backgroundImage: 'url(/assets/banners/app-background.svg)' }}
      />
      <div className="absolute inset-0 bg-radial-gold" />
      <div className="absolute inset-0 bg-radial-emerald" />
      <div className="absolute inset-0 bg-radial-violet" />

      <div
        className="absolute -left-1/3 top-[-10%] h-[85vh] w-[85vh] animate-float-slow rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(232,197,71,0.09) 0%, transparent 68%)' }}
      />
      <div
        className="animation-delay-2000 absolute -right-1/4 bottom-[-5%] h-[70vh] w-[70vh] animate-float-slow rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(74,222,128,0.07) 0%, transparent 68%)',
          animationDelay: '-4s'
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '64px 64px'
        }}
      />

      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(5, 5, 8, 0.85) 100%)'
        }}
      />
    </div>
  );
}
