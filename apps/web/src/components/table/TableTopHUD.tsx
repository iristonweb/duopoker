import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, GlassPanel, cn } from '@duopoker/ui-kit';
import type { GameStreet, JokerHandState } from '@duopoker/shared-types/index';
import { LanguageSwitch } from '../LanguageSwitch';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';
import { JokerTrumpBadge } from './JokerTrumpBadge';

const streetBadgeVariant = (street: GameStreet): 'gold' | 'emerald' | 'default' | 'rose' => {
  if (street === 'PREFLOP' || street === 'FLOP' || street === 'BIDDING') return 'gold';
  if (street === 'TURN' || street === 'RIVER' || street === 'TRICKS') return 'emerald';
  if (street === 'SHOWDOWN' || street === 'COMPLETE') return 'rose';
  return 'default';
};

const streetGlowClass = (street: GameStreet): string => {
  const v = streetBadgeVariant(street);
  if (v === 'gold') return 'shadow-[0_0_20px_rgba(232,197,71,0.28)] ring-1 ring-gold/25';
  if (v === 'emerald') return 'shadow-[0_0_20px_rgba(74,222,128,0.22)] ring-1 ring-emerald/25';
  if (v === 'rose') return 'shadow-[0_0_20px_rgba(244,63,94,0.2)] ring-1 ring-rose/25';
  return 'ring-1 ring-white/10';
};

type Props = {
  mode: 'HOLDEM' | 'JOKER';
  pot: number;
  street?: GameStreet;
  seatCount: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  chipId?: string;
  onLeaveTable?: () => void;
  leaving?: boolean;
  joker?: JokerHandState | null;
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
  joker,
  className
}: Props) {
  const { t } = useTranslation();
  const isJoker = mode === 'JOKER' && joker;
  const potLabel = isJoker ? t('table.jokerPoolLabel') : t('table.pot');
  const potValue = isJoker ? joker.pool : pot;
  const streetLabel = street ? t(`table.street.${street}`, { defaultValue: street }) : null;
  const showStreet = street && street !== 'LOBBY' && streetLabel;
  const bidding = street === 'BIDDING';

  return (
    <GlassPanel
      glow="gold"
      className={cn(
        'relative z-30 shrink-0 rounded-none border-x-0 border-t-0 border-gold/30 bg-background/80 p-0 shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_40px_rgba(232,197,71,0.08)] backdrop-blur-xl',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" />

      <div className="mx-auto flex h-14 items-center justify-between gap-2 px-3 py-2 sm:h-16 sm:gap-3 sm:px-5 sm:py-2.5">
        {/* Left: navigation + title */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {onLeaveTable ? (
            <button
              type="button"
              className="premium-link hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.28em] sm:inline sm:text-xs"
              disabled={leaving}
              onClick={onLeaveTable}
            >
              ← {t('nav.backLobby')}
            </button>
          ) : (
            <Link
              to="/lobby"
              className="premium-link hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.28em] sm:inline sm:text-xs"
            >
              ← {t('nav.backLobby')}
            </Link>
          )}
          {onLeaveTable ? (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 border-rose/30 bg-rose/5 text-[10px] text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.12)] hover:border-rose/45 hover:bg-rose/10 hover:text-rose-200 sm:text-xs"
              disabled={leaving}
              onClick={onLeaveTable}
            >
              {leaving ? t('table.leaving') : t('table.leaveTable')}
            </Button>
          ) : null}
          <span className="hidden h-5 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-gold/55 sm:text-[10px]">
              {t('table.liveTable')}
            </p>
            <div className="flex items-baseline gap-2">
              <h1 className="text-gradient-gold truncate font-display text-base font-semibold sm:text-lg">
                {mode === 'HOLDEM' ? t('table.holdem') : t('table.joker')}
              </h1>
              {handNumber > 0 ? (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-subtle sm:text-[10px]">
                  #{handNumber}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Center: pot + street (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          {isJoker ? <JokerTrumpBadge joker={joker} size="sm" /> : null}
          {mode === 'HOLDEM' ? (
            <Badge variant="gold" className="px-2.5 py-1 text-[10px] shadow-[0_0_14px_rgba(232,197,71,0.15)]">
              {t('table.blinds', { sb: smallBlind, bb: bigBlind })}
            </Badge>
          ) : isJoker ? (
            <Badge variant="gold" className="px-2.5 py-1 text-[10px] shadow-[0_0_14px_rgba(232,197,71,0.15)]">
              {t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })}
            </Badge>
          ) : null}
          <div className="glass-shine flex items-center gap-2.5 rounded-full border border-gold/40 bg-gradient-to-br from-white/[0.07] to-white/[0.02] px-4 py-2 shadow-[0_0_32px_rgba(232,197,71,0.22)] backdrop-blur-glass">
            <PokerChipVisual chipId={chipId} size="sm" />
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-semibold uppercase tracking-[0.3em] text-gold/75">
                {potLabel}
              </span>
              <span className="text-gradient-gold font-mono text-sm font-bold">
                {typeof potValue === 'number' ? potValue.toLocaleString() : potValue}
              </span>
            </div>
          </div>
          {showStreet ? (
            <Badge
              variant={streetBadgeVariant(street)}
              className={cn('px-3 py-1 text-xs normal-case tracking-normal', streetGlowClass(street))}
            >
              {streetLabel}
            </Badge>
          ) : null}
        </div>

        {/* Mobile center: compact pot pill */}
        <div className="glass-shine flex items-center gap-1.5 rounded-full border border-gold/35 bg-white/[0.05] px-2.5 py-1 shadow-[0_0_20px_rgba(232,197,71,0.16)] backdrop-blur-glass md:hidden">
          <PokerChipVisual chipId={chipId} size="sm" className="scale-90" />
          <div className="flex flex-col leading-none">
            <span className="text-[7px] font-semibold uppercase tracking-[0.24em] text-gold/70">{potLabel}</span>
            <span className="text-gradient-gold font-mono text-[11px] font-bold">
              {typeof potValue === 'number' ? potValue.toLocaleString() : potValue}
            </span>
          </div>
        </div>

        {/* Right: seats + language */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Badge
            variant="default"
            className="hidden border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] backdrop-blur-sm sm:inline-flex"
          >
            {t('table.seats', { count: seatCount })}
          </Badge>
          <LanguageSwitch />
        </div>
      </div>

      {/* Mobile meta row: blinds, street, trump */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/[0.06] px-3 py-1.5 md:hidden">
        {isJoker ? (
          <JokerTrumpBadge joker={joker} showHint={bidding} size="sm" className="scale-90" />
        ) : null}
        {showStreet ? (
          <Badge
            variant={streetBadgeVariant(street)}
            className={cn('px-2 py-0.5 text-[10px] normal-case', streetGlowClass(street))}
          >
            {streetLabel}
          </Badge>
        ) : null}
        <span className="font-mono text-[10px] text-subtle">
          {mode === 'HOLDEM'
            ? t('table.blinds', { sb: smallBlind, bb: bigBlind })
            : isJoker
              ? t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })
              : ''}
        </span>
      </div>
    </GlassPanel>
  );
}
