import { useTranslation } from 'react-i18next';
import type { GameStreet, JokerHandState } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { isRedSuit, jokerTrumpDisplay } from '../../lib/joker-labels';

type Props = {
  joker: Pick<JokerHandState, 'trumpSuit' | 'trumpCard'>;
  street?: GameStreet;
  showHint?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

export function JokerTrumpBadge({ joker, street, showHint = false, size = 'md', className }: Props) {
  const { t } = useTranslation();
  const trump = jokerTrumpDisplay(joker, t, street);
  const compact = size === 'sm';
  const trumpKey = joker.trumpSuit ?? joker.trumpCard ?? 'none';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'inline-flex flex-col items-center rounded-xl border border-gold/25 bg-black/55 px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md',
        compact && 'px-2.5 py-1',
        className
      )}
      key={trumpKey}
    >
      <span
        className={cn(
          'font-semibold uppercase tracking-[0.18em] text-gold/75',
          compact ? 'text-[9px]' : 'text-[10px]'
        )}
      >
        {t('table.jokerTrumpHeading')}
      </span>
      {trump.noTrump ? (
        <span className={cn('font-display font-semibold text-ivory', compact ? 'text-sm' : 'text-base')}>
          {trump.value}
        </span>
      ) : (
        <span
          className={cn(
            'font-display font-bold leading-tight',
            compact ? 'text-base' : 'text-lg',
            trump.suit && isRedSuit(trump.suit) ? 'text-rose-400' : 'text-zinc-100'
          )}
        >
          {trump.value}
        </span>
      )}
      {showHint && trump.hint ? (
        <span className={cn('mt-0.5 max-w-[12rem] text-center text-muted', compact ? 'text-[10px]' : 'text-xs')}>
          {trump.hint}
        </span>
      ) : null}
    </div>
  );
}
