import { cn } from '@duopoker/ui-kit';
import { tierMeetsRequirement } from '@duopoker/shared-types';
import type { SubscriptionTier } from '@duopoker/shared-types/index';
import type { BubbleOffset } from '@duopoker/table-client';
import { PlayerAvatar } from '../../../cosmetics/PlayerAvatar';
import { TurnTimer } from '../../TurnTimer';
import { SeatActionBubble } from '../../SeatActionBubble';
import { SeatStatusOverlay } from '../../SeatStatusOverlay';
import { SeatStackPill } from '../../SeatStackPill';
import { HoleCardsPeek } from '../../HoleCardsPeek';
import type { TablePlayerVisual } from '../../../PokerTable3D';
import type { SeatActionBubble as SeatBubble } from '../../../../hooks/useTableAnimationQueue';

type Props = {
  player: TablePlayerVisual;
  bubble?: SeatBubble;
  bubbleOffset?: BubbleOffset;
  secondsLeft: number | null;
  chipId: string;
  deckId: string;
  onAvatarTap?: (userId: string) => void;
};

const bubbleOffsetClass = (offset?: BubbleOffset) => {
  switch (offset?.anchor) {
    case 'below':
      return 'top-full left-1/2 mt-1 -translate-x-1/2';
    case 'left':
      return 'right-full top-1/2 mr-1 -translate-y-1/2';
    case 'right':
      return 'left-full top-1/2 ml-1 -translate-y-1/2';
    case 'above':
    default:
      return '-top-9 left-1/2 -translate-x-1/2';
  }
};

export function MobileSeatNode({
  player,
  bubble,
  bubbleOffset,
  secondsLeft,
  chipId,
  deckId,
  onAvatarTap
}: Props) {
  const premium = tierMeetsRequirement((player.tier ?? 'FREE') as SubscriptionTier, 'GOLD');
  const avatarSize = premium ? 'mobile-premium' : 'mobile';
  const holeCards = player.holeCards ?? [];
  const hiddenCount = player.hiddenCardCount ?? 0;

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {bubble ? (
        <SeatActionBubble
          text={bubble.text}
          kind={bubble.kind}
          className={cn('absolute z-10 whitespace-nowrap', bubbleOffsetClass(bubbleOffset))}
        />
      ) : null}
      <button
        type="button"
        className={cn(
          'relative rounded-full',
          player.isActive && 'ring-2 ring-emerald/50',
          player.isWinner && 'ring-2 ring-gold/60'
        )}
        onClick={() => onAvatarTap?.(player.userId)}
        aria-label={player.name}
      >
        {player.isActive && secondsLeft !== null ? (
          <div className="absolute -inset-1">
            <TurnTimer secondsLeft={secondsLeft} size={premium ? 72 : 64} className="opacity-90" />
          </div>
        ) : null}
        <SeatStatusOverlay
          folded={player.isFolded}
          allIn={!player.isFolded && player.isAllIn}
          size="sm"
        />
        {(holeCards.length > 0 || hiddenCount > 0) && !player.isHero ? (
          <HoleCardsPeek
            cards={holeCards}
            hiddenCount={hiddenCount}
            revealCards={player.revealCards}
            deckId={deckId}
            side="right"
          />
        ) : null}
        <PlayerAvatar
          name={player.name}
          avatarUrl={player.avatar}
          tableStatus={player.tableStatus}
          frameId={player.equipped?.frame}
          titleId={player.equipped?.title}
          tier={player.tier}
          active={player.isActive}
          folded={player.isFolded}
          size={avatarSize as 'mobile' | 'mobile-premium'}
          hideName
        />
      </button>
      <SeatStackPill
        name={player.name}
        stack={player.stack}
        chipId={chipId}
        compact
        className="w-full"
      />
      {(player.roundBet ?? 0) > 0 ? (
        <span className="rounded-full border border-gold/35 bg-black/70 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-200">
          +{player.roundBet?.toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}
