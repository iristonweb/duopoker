import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, cn } from '@duopoker/ui-kit';
import { LanguageSwitch } from '../LanguageSwitch';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';

const streetBadgeVariant = (street: string): 'gold' | 'emerald' | 'default' | 'rose' => {
  if (street === 'PREFLOP' || street === 'FLOP' || street === 'BIDDING') return 'gold';
  if (street === 'TURN' || street === 'RIVER' || street === 'TRICKS') return 'emerald';
  if (street === 'SHOWDOWN' || street === 'COMPLETE') return 'rose';
  return 'default';
};

type Props = {
  mode: 'HOLDEM' | 'JOKER';
  pot: number;
  street?: string;
  seatCount: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  chipId?: string;
  onLeaveTable?: () => void;
  leaving?: boolean;
  className?: string;
};

export function TableTopHUD({
  mode,
  pot,
  street,
  seatCount,
  smallBlind,
  bigBlind,
  handNumber,
  chipId = 'chip_classic',
  onLeaveTable,
  leaving,
  className
}: Props) {
  const { t } = useTranslation();

  return (
    <header
      className={cn(
        'relative z-30 shrink-0 border-b border-gold/20 bg-background/75 backdrop-blur-glass',
        'shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      <div className="mx-auto flex h-12 items-center justify-between gap-2 px-3 sm:h-14 sm:gap-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onLeaveTable ? (
            <button
              type="button"
              className="premium-link hidden shrink-0 text-[11px] font-semibold uppercase tracking-wider sm:inline sm:text-xs"
              disabled={leaving}
              onClick={onLeaveTable}
            >
              ← {t('nav.backLobby')}
            </button>
          ) : (
            <Link
              to="/lobby"
              className="premium-link hidden shrink-0 text-[11px] font-semibold uppercase tracking-wider sm:inline sm:text-xs"
            >
              ← {t('nav.backLobby')}
            </Link>
          )}
          {onLeaveTable ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 border-rose/25 text-[11px] text-rose-300 hover:border-rose/40 hover:text-rose-200 sm:text-xs"
              disabled={leaving}
              onClick={onLeaveTable}
            >
              {leaving ? t('table.leaving') : t('table.leaveTable')}
            </Button>
          ) : null}
          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
          <h1 className="truncate font-display text-sm font-semibold text-ivory sm:text-base">
            {mode === 'HOLDEM' ? t('table.holdem') : t('table.joker')}
          </h1>
          {handNumber > 0 ? (
            <span className="hidden font-mono text-[10px] text-subtle sm:inline">#{handNumber}</span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Badge variant="gold" className="hidden px-2 py-0.5 text-[10px] sm:inline-flex">
            {t('table.blinds', { sb: smallBlind, bb: bigBlind })}
          </Badge>
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
          <Badge variant="default" className="hidden sm:inline-flex">
            {t('table.seats', { count: seatCount })}
          </Badge>
          <LanguageSwitch />
        </div>
      </div>
      <div className="flex justify-center border-t border-white/[0.04] px-3 py-1 sm:hidden">
        <span className="font-mono text-[10px] text-subtle">
          {t('table.blinds', { sb: smallBlind, bb: bigBlind })}
          {handNumber > 0 ? ` · #${handNumber}` : ''}
        </span>
      </div>
    </header>
  );
}
