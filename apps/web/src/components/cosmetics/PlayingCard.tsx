import type { Card } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { deckBackUrl, isPremiumDeck } from '../../lib/cosmetics-client';

const suitSymbol = (s: string) => (s === 'H' ? '♥' : s === 'D' ? '♦' : s === 'C' ? '♣' : '♠');
const rankLabel = (r: string) => (r === 'T' ? '10' : r);

const suitColor = (s: string) => (s === 'H' || s === 'D' ? 'text-rose-500' : 'text-zinc-900');

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
  const sizeClass =
    size === 'sm' ? 'h-16 w-11 rounded-md' : size === 'lg' ? 'h-28 w-20 rounded-xl' : 'h-20 w-14 rounded-lg';

  if (!faceUp || !card) {
    const premium = isPremiumDeck(deckId);
    return (
      <div
        className={cn(
          'relative overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-white/10',
          sizeClass,
          premium && deckId === 'deck_royal' && 'card-back-royal',
          premium && deckId === 'deck_platinum' && 'card-back-platinum',
          className
        )}
      >
        <img src={deckBackUrl(deckId)} alt="" className="h-full w-full object-cover" draggable={false} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20" />
      </div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between bg-ivory p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-black/10',
        sizeClass,
        className
      )}
    >
      <div className={cn('font-display text-sm font-bold leading-none', suitColor(suit))}>
        {rankLabel(rank)}
        <span className="block text-base">{suitSymbol(suit)}</span>
      </div>
      <div className={cn('self-center font-display text-2xl font-semibold', suitColor(suit))}>{suitSymbol(suit)}</div>
      <div className={cn('rotate-180 self-end font-display text-sm font-bold leading-none', suitColor(suit))}>
        {rankLabel(rank)}
        <span className="block text-base">{suitSymbol(suit)}</span>
      </div>
    </div>
  );
}
