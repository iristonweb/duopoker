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
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10';
  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <div className={cn('relative', dim)}>
        <img
          src={chipImageUrl(chipId)}
          alt=""
          className="h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/15 to-transparent" />
      </div>
      {amount != null ? (
        <span className="mt-0.5 font-mono text-[10px] font-semibold text-gold-light">{amount.toLocaleString()}</span>
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
  const chips = Math.min(count, 5);
  return (
    <div className={cn('relative h-10 w-10', className)}>
      {Array.from({ length: chips }, (_, i) => (
        <img
          key={i}
          src={chipImageUrl(chipId)}
          alt=""
          className="absolute left-0 h-8 w-8 object-contain drop-shadow-md"
          style={{ top: `${i * -3}px`, zIndex: i }}
          draggable={false}
        />
      ))}
    </div>
  );
}
