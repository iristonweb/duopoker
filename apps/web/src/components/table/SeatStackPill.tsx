import { cn } from '@duopoker/ui-kit';
import { PokerChipStack } from '../cosmetics/PokerChipVisual';

type Props = {
  name?: string;
  stack: number;
  chipId: string;
  showName?: boolean;
  className?: string;
  compact?: boolean;
};

/** X-Poker style: dark pill, white name, gold stack. */
export function SeatStackPill({
  name,
  stack,
  chipId,
  showName = true,
  className,
  compact = false
}: Props) {
  return (
    <div
      className={cn(
        'relative z-[1] flex min-w-[4rem] flex-col items-center rounded-lg border border-black/50 bg-black/80 px-2 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.55)] backdrop-blur-sm',
        compact ? 'min-w-[3.5rem] px-1.5 py-0.5' : 'sm:min-w-[4.5rem]',
        className
      )}
    >
      {showName && name ? (
        <span
          className={cn(
            'seat-name w-full truncate text-center font-medium text-white/95',
            compact ? 'max-w-[4rem] text-[8px]' : 'max-w-[5.5rem] text-[9px] sm:text-[10px]'
          )}
        >
          {name}
        </span>
      ) : null}
      <div className="flex items-center justify-center gap-1">
        <PokerChipStack
          chipId={chipId}
          count={Math.min(3, 2 + Math.floor(stack / 5000))}
          className={compact ? 'scale-75' : 'scale-90'}
        />
        <span
          className={cn(
            'font-mono font-bold tabular-nums text-amber-300',
            compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'
          )}
        >
          {stack.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
