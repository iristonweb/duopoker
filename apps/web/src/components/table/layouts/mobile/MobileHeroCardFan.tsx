import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import type { Card } from '@duopoker/shared-types/index';
import { PlayingCard } from '../../../cosmetics/PlayingCard';

type Props = {
  cards: Card[];
  deckId: string;
  className?: string;
};

const fanRotate = (index: number, total: number) => {
  if (total <= 1) return 0;
  if (total === 2) return index === 0 ? -10 : 10;
  const mid = (total - 1) / 2;
  const spread = Math.min(12, 36 / total);
  return (index - mid) * spread;
};

export function MobileHeroCardFan({ cards, deckId, className }: Props) {
  if (!cards.length) return null;

  const manyCards = cards.length > 3;

  return (
    <div
      data-testid="mobile-hero-card-fan"
      className={cn(
        'relative z-20 flex shrink-0 items-end justify-center px-4 pb-2',
        manyCards ? 'pointer-events-auto overflow-x-auto premium-scroll' : 'pointer-events-none',
        className
      )}
      style={{ minHeight: '5.5rem' }}
    >
      <div
        className={cn(
          'flex items-end justify-center',
          manyCards ? 'min-w-max gap-1 px-2' : 'max-w-[calc(100vw-2rem)]'
        )}
      >
        <AnimatePresence mode="popLayout">
          {cards.map((c, i) => (
            <motion.div
              key={c}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.9 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: fanRotate(i, cards.length)
              }}
              exit={{ opacity: 0, scale: 0.85 }}
              className={cn(
                'mobile-playing-card shadow-lg',
                manyCards ? 'ml-0' : '-ml-3 first:ml-0',
                !manyCards && i > 0 && 'shadow-lg'
              )}
              style={{ zIndex: i }}
            >
              <PlayingCard card={c} faceUp deckId={deckId} size="mobile" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
