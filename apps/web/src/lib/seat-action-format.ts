import {
  formatSeatActionShort,
  seatActionIcon,
  type SeatActionDisplay,
  type SeatActionKind
} from '@duopoker/table-client/feed/seat-action-format';

export { formatSeatActionShort, seatActionIcon, type SeatActionDisplay, type SeatActionKind };

export const seatActionStyles: Record<SeatActionKind, string> = {
  fold: 'border-rose/50 bg-rose/15 text-rose shadow-[0_0_20px_rgba(244,63,94,0.35)]',
  check: 'border-zinc-400/40 bg-zinc-900/80 text-zinc-200 shadow-[0_0_16px_rgba(161,161,170,0.2)]',
  call: 'border-emerald/45 bg-emerald/12 text-emerald shadow-[0_0_20px_rgba(74,222,128,0.3)]',
  bet: 'border-emerald/45 bg-emerald/12 text-emerald shadow-[0_0_20px_rgba(74,222,128,0.3)]',
  raise: 'border-gold/50 bg-gold/12 text-gold-light shadow-glow-gold',
  allIn: 'border-amber-400/65 bg-amber-500/22 text-amber-50 shadow-[0_0_28px_rgba(251,191,36,0.5)] ring-1 ring-amber-300/30',
  bid: 'border-violet-400/45 bg-violet-500/12 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  trump: 'border-violet-400/45 bg-violet-500/12 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  playCard: 'border-violet-400/45 bg-violet-500/12 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  blindSB: 'border-gold/35 bg-gold/10 text-gold-light/90 shadow-[0_0_16px_rgba(232,197,71,0.25)]',
  blindBB: 'border-gold/45 bg-gold/15 text-gold-light shadow-glow-gold'
};
