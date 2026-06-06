import { appBackgroundUrl, cardsBackgroundUrl } from '@duopoker/shared-types';

export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-mesh-premium opacity-50" />
      <img
        src={cardsBackgroundUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.48] sm:opacity-[0.55]"
        draggable={false}
        decoding="async"
      />
      <img
        src={appBackgroundUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.08]"
        draggable={false}
        decoding="async"
      />
      <div className="absolute inset-0 bg-radial-gold opacity-80" />
      <div className="absolute inset-0 bg-radial-emerald opacity-70" />

      <div
        className="absolute -left-1/3 top-[-10%] h-[85vh] w-[85vh] animate-float-slow rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(232,197,71,0.08) 0%, transparent 68%)' }}
      />
      <div
        className="animation-delay-2000 absolute -right-1/4 bottom-[-5%] h-[70vh] w-[70vh] animate-float-slow rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 68%)',
          animationDelay: '-4s'
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 88% 72% at 50% 50%, transparent 38%, rgba(5, 5, 8, 0.68) 100%)'
        }}
      />
    </div>
  );
}
