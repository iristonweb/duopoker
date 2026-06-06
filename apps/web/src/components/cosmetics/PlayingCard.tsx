import type { Card } from '@duopoker/shared-types/index';
import { deckBackEffectClass } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { deckBackUrl } from '../../lib/cosmetics-client';

const suitSymbol = (s: string) => (s === 'H' ? '♥' : s === 'D' ? '♦' : s === 'C' ? '♣' : '♠');
const rankLabel = (r: string) => (r === 'T' ? '10' : r);
const isRed = (s: string) => s === 'H' || s === 'D';
const isFace = (r: string) => r === 'A' || r === 'K' || r === 'Q' || r === 'J';

const sizeMap = {
  sm: { box: 'h-[4.5rem] w-[3.15rem]', radius: 'rounded-[0.45rem]', pip: 'text-lg', corner: 'text-[0.62rem]', face: 'text-xl' },
  md: { box: 'h-[5.75rem] w-[4rem]', radius: 'rounded-[0.55rem]', pip: 'text-2xl', corner: 'text-[0.72rem]', face: 'text-2xl' },
  lg: { box: 'h-[7.5rem] w-[5.25rem]', radius: 'rounded-[0.65rem]', pip: 'text-3xl', corner: 'text-sm', face: 'text-3xl' }
} as const;

function CardFace({
  rank,
  suit,
  size,
  className
}: {
  rank: string;
  suit: string;
  size: keyof typeof sizeMap;
  className?: string;
}) {
  const s = sizeMap[size];
  const color = isRed(suit) ? '#dc2626' : '#18181b';
  const sym = suitSymbol(suit);
  const label = rankLabel(rank);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#fdfbf7] shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-black/10',
        s.box,
        s.radius,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-black/[0.04]" />
      <div className="pointer-events-none absolute inset-[3px] rounded-[inherit] border border-black/[0.06]" />
      <span
        className="pointer-events-none absolute bottom-1 right-1 font-display text-[0.45rem] font-bold uppercase tracking-[0.18em] text-black/[0.07]"
        aria-hidden
      >
        DP
      </span>

      <div className="absolute left-[0.35rem] top-[0.3rem] flex flex-col items-center leading-none" style={{ color }}>
        <span className={cn('font-display font-bold tracking-tight', s.corner)}>{label}</span>
        <span className={cn('font-display', s.corner)}>{sym}</span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        {isFace(rank) ? (
          <div className="flex flex-col items-center leading-none" style={{ color }}>
            <span className={cn('font-display font-bold', s.face)}>{label}</span>
            <span className={cn('font-display opacity-90', s.pip)}>{sym}</span>
          </div>
        ) : (
          <span className={cn('font-display font-semibold drop-shadow-sm', s.pip)} style={{ color }}>
            {sym}
          </span>
        )}
      </div>

      <div
        className="absolute bottom-[0.3rem] right-[0.35rem] flex rotate-180 flex-col items-center leading-none"
        style={{ color }}
      >
        <span className={cn('font-display font-bold tracking-tight', s.corner)}>{label}</span>
        <span className={cn('font-display', s.corner)}>{sym}</span>
      </div>
    </div>
  );
}

export function PlayingCard({
  card,
  faceUp = true,
  deckId = 'deck_classic',
  className,
  size = 'md'
}: {
  card?: Card;
  faceUp?: boolean;
  deckId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const s = sizeMap[size];

  if (!faceUp || !card) {
    const effectClass = deckBackEffectClass(deckId);
    return (
      <div
        className={cn(
          'relative overflow-hidden ring-1 ring-white/15',
          s.box,
          s.radius,
          effectClass,
          className
        )}
      >
        <img
          src={deckBackUrl(deckId)}
          alt=""
          className="h-full w-full object-contain object-center"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/10" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/[0.08]" />
      </div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  return <CardFace rank={rank} suit={suit} size={size} className={className} />;
}
