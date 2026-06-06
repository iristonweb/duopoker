import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, cn } from '@duopoker/ui-kit';
import { LanguageSwitch } from '../LanguageSwitch';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';

const streetBadgeVariant = (street: string): 'gold' | 'emerald' | 'default' | 'rose' => {
  if (street === 'PREFLOP' || street === 'FLOP') return 'gold';
  if (street === 'TURN' || street === 'RIVER') return 'emerald';
  if (street === 'SHOWDOWN' || street === 'COMPLETE') return 'rose';
  return 'default';
};

type Props = {
  mode: 'HOLDEM' | 'RASPISNOY';
  pot: number;
  street?: string;
  seatCount: number;
  chipId?: string;
  className?: string;
};

export function TableTopHUD({ mode, pot, street, seatCount, chipId = 'chip_classic', className }: Props) {
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        'relative z-30 shrink-0 border-b border-gold/20 bg-background/75 backdrop-blur-glass',
        'shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      <div className="mx-auto flex h-12 items-center justify-between gap-3 px-3 sm:h-14 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            to="/lobby"
            className="premium-link shrink-0 text-[11px] font-semibold uppercase tracking-wider sm:text-xs"
          >
            ← {t('nav.backLobby')}
          </Link>
          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
          <h1 className="truncate font-display text-sm font-semibold text-ivory sm:text-base">
            {mode === 'HOLDEM' ? t('table.holdem') : t('table.raspisnoy')}
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-gold/25 bg-black/50 px-2.5 py-1 shadow-inner sm:gap-2 sm:px-3 sm:py-1.5">
            <PokerChipVisual chipId={chipId} size="sm" />
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-gold/70 sm:text-[9px]">
                {t('table.pot')}
              </span>
              <span className="font-mono text-xs font-bold text-gold-light sm:text-sm">{pot.toLocaleString()}</span>
            </div>
          </div>
          {street && street !== 'LOBBY' ? (
            <Badge variant={streetBadgeVariant(street)} className="hidden normal-case tracking-normal sm:inline-flex">
              {street}
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="default">{t('table.seats', { count: seatCount })}</Badge>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}
