import { gameChipId } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';
import { chipImageUrl } from '../../lib/cosmetics-client';

export function PokerChipVisual({
  chipId = 'chip_classic',
  amount,
  className,
  size = 'md'
}: {
  chipId?: string;
  amount?: number;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const resolvedChipId = gameChipId(chipId);
  const dim =
    size === 'xs'
      ? 'h-4 w-4'
      : size === 'sm'
        ? 'h-9 w-9'
        : size === 'lg'
          ? 'h-16 w-16'
          : 'h-11 w-11';
  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <div className={cn('relative flex items-center justify-center', dim)}>
        <img
          src={chipImageUrl(resolvedChipId)}
          alt=""
          className="h-full w-full max-h-full max-w-full object-contain object-center [background:transparent] drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]"
          draggable={false}
        />
      </div>
      {amount != null ? (
        <span className="mt-0.5 font-mono text-[10px] font-semibold text-gold-light">
          {amount.toLocaleString()}
        </span>
      ) : null}
    </div>
  );
}

export function PokerChipStack({
  chipId = 'chip_classic',
  count = 3,
  className
}: {
  chipId?: string;
  count?: number;
  className?: string;
}) {
  const resolvedChipId = gameChipId(chipId);
  const chips = Math.min(count, 5);
  return (
    <div className={cn('relative h-11 w-11', className)}>
      {Array.from({ length: chips }, (_, i) => (
        <img
          key={i}
          src={chipImageUrl(resolvedChipId)}
          alt=""
          className="absolute left-1/2 h-9 w-9 -translate-x-1/2 object-contain object-center [background:transparent] drop-shadow-md"
          style={{ top: `${i * -3}px`, zIndex: i }}
          draggable={false}
        />
      ))}
    </div>
  );
}
