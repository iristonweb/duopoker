import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';

type Props = {
  folded?: boolean;
  allIn?: boolean;
  className?: string;
  size?: 'sm' | 'md';
};

export function SeatStatusOverlay({ folded, allIn, className, size = 'md' }: Props) {
  const { t } = useTranslation();

  if (!folded && !allIn) return null;

  const compact = size === 'sm';

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-[8%] z-[6] flex justify-center',
        className
      )}
      aria-hidden
    >
      <span
        className={cn(
          'rounded-full border font-bold uppercase tracking-wide shadow-lg backdrop-blur-sm',
          compact ? 'px-2 py-0.5 text-[8px]' : 'px-2.5 py-1 text-[9px] sm:px-3 sm:py-1 sm:text-[10px]',
          folded
            ? 'border-rose-400/70 bg-rose-600/85 text-white shadow-[0_4px_16px_rgba(244,63,94,0.45)]'
            : 'border-violet-300/70 bg-violet-600/85 text-violet-50 shadow-[0_4px_16px_rgba(139,92,246,0.45)]'
        )}
      >
        {folded ? t('table.seatOut') : t('table.seatAllIn')}
      </span>
    </div>
  );
}
