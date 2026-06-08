import { cn } from '@duopoker/ui-kit';
import { tierMeetsRequirement } from '@duopoker/shared-types';
import type { SubscriptionTier } from '@duopoker/shared-types/index';
import { PlayerAvatar } from '../../../cosmetics/PlayerAvatar';
import { PokerChipVisual } from '../../../cosmetics/PokerChipVisual';
import { TurnTimer } from '../../TurnTimer';
import { SeatActionBubble } from '../../SeatActionBubble';
import type { TablePlayerVisual } from '../../../PokerTable3D';
import type { SeatActionBubble as SeatBubble } from '../../../../hooks/useTableAnimationQueue';

type Props = {
  player: TablePlayerVisual;
  bubble?: SeatBubble;
  secondsLeft: number | null;
  chipId: string;
  onAvatarTap?: (userId: string) => void;
};

export function MobileSeatNode({ player, bubble, secondsLeft, chipId, onAvatarTap }: Props) {
  const premium = tierMeetsRequirement((player.tier ?? 'FREE') as SubscriptionTier, 'GOLD');
  const avatarSize = premium ? 'mobile-premium' : 'mobile';

  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {bubble ? (
        <SeatActionBubble
          text={bubble.text}
          kind={bubble.kind}
          className="absolute -top-8 z-10 whitespace-nowrap"
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
            <TurnTimer secondsLeft={secondsLeft} size={premium ? 76 : 68} className="opacity-90" />
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
        <PokerChipVisual chipId={chipId} size="xs" className="h-3 w-3" />
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
