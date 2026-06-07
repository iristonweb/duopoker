import { cn } from '@duopoker/ui-kit';
import { PlayingCard } from '../cosmetics/PlayingCard';

type Props = {
  count: number;
  deckId: string;
  className?: string;
};

/** Face-down stack representing tricks won this hand. */
export function JokerTrickPile({ count, deckId, className }: Props) {
  if (count <= 0) return null;
  const shown = Math.min(count, 4);
  return (
    <div className={cn('relative z-[1] flex h-8 w-10 items-end justify-center', className)}>
      {Array.from({ length: shown }, (_, i) => (
        <div
          key={i}
          className="absolute bottom-0"
          style={{ transform: `translateX(${(i - (shown - 1) / 2) * 4}px) rotate(${(i - 1) * 4}deg)` }}
        >
          <PlayingCard deckId={deckId} faceUp={false} size="sm" />
        </div>
      ))}
      {count > shown ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-violet-600/90 px-1 text-[8px] font-bold text-white">
          +{count - shown}
        </span>
      ) : null}
    </div>
  );
}
