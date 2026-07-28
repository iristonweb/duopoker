import type { Card } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from '../cosmetics/PlayingCard';

type Props = {
  cards?: Card[];
  hiddenCount?: number;
  revealCards?: boolean;
  deckId: string;
  side?: 'right' | 'left';
  className?: string;
};

/** Small hole cards peeking from behind the avatar (X-Poker style). */
export function HoleCardsPeek({
  cards = [],
  hiddenCount = 0,
  revealCards = false,
  deckId,
  side = 'right',
  className
}: Props) {
  const count = cards.length || hiddenCount;
  if (count <= 0) return null;

  const slots = cards.length
    ? cards.slice(0, 2)
    : Array.from({ length: Math.min(hiddenCount, 2) });

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-1/2 z-0 flex -translate-y-1/2',
        side === 'right' ? '-right-3 translate-x-1/2' : '-left-3 -translate-x-1/2',
        className
      )}
      aria-hidden
    >
      {slots.map((c, i) => {
        const card = typeof c === 'string' && c.length > 0 ? c : undefined;
        const faceUp = Boolean(revealCards && card && !String(card).startsWith('__'));
        return (
          <PlayingCard
            key={i}
            card={faceUp ? card : undefined}
            faceUp={faceUp}
            size="xs"
            deckId={deckId}
            className={cn(
              'shadow-[0_4px_12px_rgba(0,0,0,0.55)]',
              i === 0 && '-rotate-[14deg]',
              i === 1 && '-ml-3 rotate-[10deg]'
            )}
          />
        );
      })}
    </div>
  );
}
