import { cn } from '@duopoker/ui-kit';
import { tierMeetsRequirement } from '@duopoker/shared-types';
import type { SubscriptionTier } from '@duopoker/shared-types/index';
import type { BubbleOffset } from '@duopoker/table-client';
import { PlayerAvatar } from '../../../cosmetics/PlayerAvatar';
import { PokerChipVisual } from '../../../cosmetics/PokerChipVisual';
import { TurnTimer } from '../../TurnTimer';
import { SeatActionBubble } from '../../SeatActionBubble';
import type { TablePlayerVisual } from '../../../PokerTable3D';
import type { SeatActionBubble as SeatBubble } from '../../../../hooks/useTableAnimationQueue';

type Props = {
  player: TablePlayerVisual;
  bubble?: SeatBubble;
  bubbleOffset?: BubbleOffset;
  secondsLeft: number | null;
  chipId: string;
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
      return '-top-8 left-1/2 -translate-x-1/2';
  }
};

export function MobileSeatNode({
  player,
  bubble,
  bubbleOffset,
  secondsLeft,
  chipId,
  onAvatarTap
}: Props) {
  const premium = tierMeetsRequirement((player.tier ?? 'FREE') as SubscriptionTier, 'GOLD');
  const avatarSize = premium ? 'mobile-premium' : 'mobile';

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
        className={cn('relative rounded-full', player.isActive && 'ring-2 ring-emerald/50')}
        onClick={() => onAvatarTap?.(player.userId)}
        aria-label={player.name}
      >
        {player.isActive && secondsLeft !== null ? (
          <div className="absolute -inset-1">
            <TurnTimer secondsLeft={secondsLeft} size={premium ? 72 : 64} className="opacity-90" />
          </div>
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
      <p className="max-w-[4.5rem] truncate text-[10px] font-medium text-ivory">{player.name}</p>
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-1.5 py-0.5">
        <PokerChipVisual chipId={chipId} size="xs" />
        <span className="font-mono text-[10px] tabular-nums text-gold-light">{player.stack}</span>
      </div>
      {(player.roundBet ?? 0) > 0 ? (
        <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] text-gold-light">
          +{player.roundBet}
        </span>
      ) : null}
    </div>
  );
}
