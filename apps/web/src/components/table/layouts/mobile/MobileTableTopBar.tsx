import { Badge, cn } from '@duopoker/ui-kit';
import type { GameMode, GameStreet, JokerHandState } from '@duopoker/shared-types/index';
import { JokerTrumpBadge } from '../../JokerTrumpBadge';
import { TurnTimer } from '../../TurnTimer';

type Props = {
  mode: GameMode;
  street?: GameStreet;
  handNumber: number;
  joker?: JokerHandState | null;
  secondsLeft: number | null;
  isHeroTurn: boolean;
  className?: string;
  streetLabel: string | null;
};

export function MobileTableTopBar({
  mode,
  street,
  handNumber,
  joker,
  secondsLeft,
  isHeroTurn,
  className,
  streetLabel
}: Props) {
  const isJoker = mode === 'JOKER' && joker;

  return (
    <header
      data-testid="mobile-table-top-bar"
      className={cn(
        'relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-gold/20 bg-background/95 px-3 py-2',
        className
      )}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <div className="w-10 shrink-0" aria-hidden />

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {handNumber > 0 ? (
          <Badge variant="default" className="px-2 py-0.5 text-[10px]">
            #{handNumber}
          </Badge>
        ) : null}
        {isJoker ? <JokerTrumpBadge joker={joker} size="sm" /> : null}
        {streetLabel && street && street !== 'LOBBY' ? (
          <Badge variant="gold" className="px-2 py-0.5 text-[10px]">
            {streetLabel}
          </Badge>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end">
        {isHeroTurn && secondsLeft !== null ? (
          <TurnTimer secondsLeft={secondsLeft} size={40} />
        ) : (
          <span className="w-10" aria-hidden />
        )}
      </div>
    </header>
  );
}
