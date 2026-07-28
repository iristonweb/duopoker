import { useTranslation } from 'react-i18next';
import { cn } from '@duopoker/ui-kit';
import type { GameStreet } from '@duopoker/shared-types/index';
import { tableCenterTopStyle } from '../../lib/table-layout';
import type { TableSurfaceLayout } from '@duopoker/table-client';

type Props = {
  street?: GameStreet;
  cardsThisDeal?: number;
  surfaceLayout?: TableSurfaceLayout;
  className?: string;
};

/** Mode-correct felt status for Joker (replaces empty/pot center during bid/trump). */
export function JokerFeltStatusChip({
  street,
  cardsThisDeal,
  surfaceLayout = 'ring',
  className
}: Props) {
  const { t } = useTranslation();
  if (street !== 'BIDDING' && street !== 'TRUMP_CHOICE') return null;

  const label =
    street === 'TRUMP_CHOICE'
      ? t('table.jokerTrumpChoosing')
      : cardsThisDeal
        ? t('table.jokerBiddingStatus', { cards: cardsThisDeal })
        : t('table.jokerBidPrompt');

  return (
    <div
      data-testid="joker-felt-status"
      className={cn(
        'pointer-events-none absolute left-1/2 z-pot -translate-x-1/2',
        className
      )}
      style={tableCenterTopStyle(surfaceLayout, 'potTop')}
    >
      <div className="rounded-full border border-violet-400/40 bg-violet-950/75 px-3 py-1.5 shadow-[0_0_24px_rgba(167,139,250,0.2)] backdrop-blur-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-100 sm:text-[11px]">
          {label}
        </p>
      </div>
    </div>
  );
}
