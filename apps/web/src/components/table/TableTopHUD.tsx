import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Badge, Button, cn, DpClubMark } from '@duopoker/ui-kit';
import type { GameMode, GameStreet, JokerHandState, JokerMatchRules } from '@duopoker/shared-types/index';
import type { TableLeaderboardEntry } from '@duopoker/table-client';
import { LanguageSwitch } from '../LanguageSwitch';
import { PokerChipVisual } from '../cosmetics/PokerChipVisual';
import { JokerTrumpBadge } from './JokerTrumpBadge';
import { VoiceChatHudButton } from './VoiceChatPill';
import { LeaderboardPodium, type LeaderboardProfile } from './LeaderboardPodium';
import { TrophyIcon } from './TrophyIcon';

const streetBadgeVariant = (street: GameStreet): 'gold' | 'emerald' | 'default' | 'rose' => {
  if (street === 'PREFLOP' || street === 'FLOP' || street === 'BIDDING' || street === 'TRUMP_CHOICE') return 'gold';
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
  mode: GameMode;
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
  jokerRules?: JokerMatchRules;
  leaderboardEntries?: TableLeaderboardEntry[];
  leaderboardProfiles?: Record<string, LeaderboardProfile>;
  heroId?: string;
  onOpenLeaderboard?: () => void;
  className?: string;
};

function MetaChipGroup({
  mode,
  isJoker,
  joker,
  jokerRules,
  smallBlind,
  bigBlind,
  seatCount,
  street,
  showStreet,
  streetLabel,
  t
}: {
  mode: GameMode;
  isJoker: JokerHandState | null;
  joker: JokerHandState | null | undefined;
  jokerRules?: JokerMatchRules;
  smallBlind: number;
  bigBlind: number;
  seatCount: number;
  street?: GameStreet;
  showStreet: boolean;
  streetLabel: string | null;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const bidding = street === 'BIDDING';

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {isJoker && joker ? <JokerTrumpBadge joker={joker} showHint={bidding} size="sm" className="scale-90 sm:scale-100" /> : null}
      {mode === 'HOLDEM' ? (
        <Badge variant="gold" className="px-2 py-0.5 text-[9px] shadow-[0_0_14px_rgba(232,197,71,0.12)] sm:px-2.5 sm:py-1 sm:text-[10px]">
          {t('table.blinds', { sb: smallBlind, bb: bigBlind })}
        </Badge>
      ) : isJoker && joker ? (
        <>
          <Badge variant="gold" className="px-2 py-0.5 text-[9px] sm:px-2.5 sm:py-1 sm:text-[10px]">
            {t('table.jokerPool', { pool: joker.pool, hand: joker.matchHandIndex + 1 })}
          </Badge>
          {jokerRules?.strictJoker ? (
            <Badge variant="emerald" className="hidden px-2 py-0.5 text-[9px] sm:inline-flex">
              {t('lobby.jokerStrict')}
            </Badge>
          ) : null}
          {jokerRules?.scoringMode === 'minus' ? (
            <Badge variant="default" className="hidden px-2 py-0.5 text-[9px] sm:inline-flex">
              {t('lobby.jokerMinusScoring')}
            </Badge>
          ) : null}
        </>
      ) : null}
      {showStreet && street ? (
        <Badge
          variant={streetBadgeVariant(street)}
          className={cn('px-2 py-0.5 text-[10px] normal-case sm:px-3 sm:py-1 sm:text-xs', streetGlowClass(street))}
        >
          {streetLabel}
        </Badge>
      ) : null}
      <Badge
        variant="default"
        className="border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] backdrop-blur-sm sm:px-2 sm:text-[10px]"
      >
        {t('table.seats', { count: seatCount })}
      </Badge>
    </div>
  );
}

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
  jokerRules,
  leaderboardEntries = [],
  leaderboardProfiles = {},
  heroId,
  onOpenLeaderboard,
  className
}: Props) {
  const { t } = useTranslation();
  const isJoker = mode === 'JOKER' && joker ? joker : null;
  const potLabel = isJoker ? t('table.jokerPoolLabel') : t('table.pot');
  const potValue = isJoker ? joker.pool : pot;
  const streetLabel = street ? t(`table.street.${street}`, { defaultValue: street }) : null;
  const showStreet = Boolean(street && street !== 'LOBBY' && streetLabel);

  return (
    <div
      data-testid="table-top-hud"
      className={cn(
        'relative z-30 shrink-0 overflow-hidden border-b border-gold/20 bg-[linear-gradient(180deg,rgba(5,5,8,0.94)_0%,rgba(5,5,8,0.82)_100%)] shadow-[0_12px_40px_rgba(0,0,0,0.55),0_0_48px_rgba(232,197,71,0.06)] backdrop-blur-xl',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Tier 1: slim nav bar */}
      <div className="mx-auto flex h-9 items-center justify-between gap-2 px-3 sm:h-10 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onLeaveTable ? (
            <button
              type="button"
              className="premium-link shrink-0 text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-[11px]"
              disabled={leaving}
              onClick={onLeaveTable}
            >
              ← {t('nav.backLobby')}
            </button>
          ) : (
            <Link
              to="/lobby"
              className="premium-link shrink-0 text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-[11px]"
            >
              ← {t('nav.backLobby')}
            </Link>
          )}
          <span className="hidden h-4 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent sm:block" aria-hidden />
          <DpClubMark size="xs" className="hidden sm:block" />
          <div className="min-w-0 sm:hidden">
            <p className="truncate font-display text-xs font-semibold text-gradient-gold">
              {mode === 'HOLDEM' ? t('table.holdem') : t('table.joker')}
              {handNumber > 0 ? ` · #${handNumber}` : ''}
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <p className="text-[9px] font-semibold uppercase tracking-[0.32em] text-gold/50">{t('table.liveTable')}</p>
          <span className="h-3 w-px bg-white/10" aria-hidden />
          <h1 className="font-display text-sm font-semibold text-gradient-gold">
            {mode === 'HOLDEM' ? t('table.holdem') : t('table.joker')}
          </h1>
          {handNumber > 0 ? (
            <span className="rounded-full border border-gold/25 bg-gold/[0.08] px-2 py-0.5 font-mono text-[10px] text-gold-light">
              #{handNumber}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {onOpenLeaderboard ? (
            <button
              type="button"
              aria-label={t('table.openLeaderboard')}
              title={t('table.openLeaderboard')}
              onClick={onOpenLeaderboard}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold-light transition hover:border-gold/45 hover:bg-gold/10 hover:shadow-[0_0_16px_rgba(232,197,71,0.2)]"
            >
              <TrophyIcon className="h-4 w-4" />
            </button>
          ) : null}
          <VoiceChatHudButton />
          <LanguageSwitch />
          {onLeaveTable ? (
            <Button
              variant="ghost"
              size="sm"
              className="hidden border-rose/25 bg-rose/5 px-2 text-[10px] text-rose-300 hover:border-rose/40 hover:bg-rose/10 sm:inline-flex"
              disabled={leaving}
              onClick={onLeaveTable}
            >
              {leaving ? t('table.leaving') : t('table.leaveTable')}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tier 2: stats strip */}
      <div className="mx-auto flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-2.5">
        <div className="hidden min-w-0 flex-1 sm:block lg:max-w-[34%]">
          <MetaChipGroup
            mode={mode}
            isJoker={isJoker}
            joker={joker}
            jokerRules={jokerRules}
            smallBlind={smallBlind}
            bigBlind={bigBlind}
            seatCount={seatCount}
            street={street}
            showStreet={showStreet}
            streetLabel={streetLabel}
            t={t}
          />
        </div>

        <motion.div
          key={typeof potValue === 'number' ? potValue : String(potValue)}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="glass-shine relative mx-auto flex items-center gap-2.5 rounded-2xl border border-gold/45 bg-gradient-to-br from-gold/[0.12] via-white/[0.06] to-transparent px-4 py-2 shadow-[0_0_40px_rgba(232,197,71,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-glass sm:gap-3 sm:px-5 sm:py-2.5"
        >
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-gold/20 ring-inset" />
          <PokerChipVisual chipId={chipId} size="sm" className="relative z-[1] sm:scale-110" />
          <div className="relative z-[1] flex flex-col leading-none">
            <span className="text-[8px] font-semibold uppercase tracking-[0.34em] text-gold/75 sm:text-[9px]">
              {potLabel}
            </span>
            <span className="text-gradient-gold font-mono text-base font-bold sm:text-xl">
              {typeof potValue === 'number' ? potValue.toLocaleString() : potValue}
            </span>
          </div>
        </motion.div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:max-w-[34%]">
          {leaderboardEntries.length > 0 ? (
            <LeaderboardPodium
              entries={leaderboardEntries}
              mode={mode}
              heroId={heroId}
              profiles={leaderboardProfiles}
              onClick={onOpenLeaderboard}
              compact
            />
          ) : null}
        </div>
      </div>

      {/* Mobile meta row */}
      <div className="border-t border-white/[0.05] px-3 py-1.5 sm:hidden">
        <MetaChipGroup
          mode={mode}
          isJoker={isJoker}
          joker={joker}
          jokerRules={jokerRules}
          smallBlind={smallBlind}
          bigBlind={bigBlind}
          seatCount={seatCount}
          street={street}
          showStreet={showStreet}
          streetLabel={streetLabel}
          t={t}
        />
      </div>
    </div>
  );
}
