import type { Card, PlayerAction } from '@duopoker/shared-types/index';

export type SeatActionKind =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'bid'
  | 'playCard'
  | 'blindSB'
  | 'blindBB';

export type SeatActionDisplay = {
  kind: SeatActionKind;
  label: string;
};

export const formatSeatActionShort = (
  action: PlayerAction | { type: 'blindSB' | 'blindBB'; amount?: number },
  t: (key: string, opts?: Record<string, unknown>) => string,
  cardFormatter?: (card: Card) => string
): SeatActionDisplay => {
  if (action.type === 'blindSB') {
    return { kind: 'blindSB', label: t('table.postsBlindSB', { amount: action.amount ?? 0 }) };
  }
  if (action.type === 'blindBB') {
    return { kind: 'blindBB', label: t('table.postsBlindBB', { amount: action.amount ?? 0 }) };
  }

  switch (action.type) {
    case 'fold':
      return { kind: 'fold', label: t('table.actionFold') };
    case 'check':
      return { kind: 'check', label: t('table.actionCheck') };
    case 'call':
      return { kind: 'call', label: t('table.actionCall', { amount: action.amount ?? 0 }) };
    case 'bet':
      return { kind: 'bet', label: t('table.actionBet', { amount: action.amount ?? 0 }) };
    case 'raise':
      return { kind: 'raise', label: t('table.actionRaise', { amount: action.amount ?? 0 }) };
    case 'bid':
      return { kind: 'bid', label: t('table.actionBid', { amount: action.amount ?? 0 }) };
    case 'playCard':
      return {
        kind: 'playCard',
        label: action.card
          ? cardFormatter
            ? cardFormatter(action.card)
            : action.card
          : t('table.actionPlay')
      };
    default:
      return { kind: 'check', label: String(action.type) };
  }
};

export const seatActionIcon: Record<SeatActionKind, string> = {
  fold: '✕',
  check: '✓',
  call: '→',
  bet: '●',
  raise: '▲',
  bid: '♠',
  playCard: '♣',
  blindSB: 'SB',
  blindBB: 'BB'
};

export const seatActionStyles: Record<SeatActionKind, string> = {
  fold: 'border-rose/50 bg-rose/15 text-rose shadow-[0_0_20px_rgba(244,63,94,0.35)]',
  check: 'border-zinc-400/40 bg-zinc-900/80 text-zinc-200 shadow-[0_0_16px_rgba(161,161,170,0.2)]',
  call: 'border-emerald/45 bg-emerald/12 text-emerald shadow-[0_0_20px_rgba(74,222,128,0.3)]',
  bet: 'border-emerald/45 bg-emerald/12 text-emerald shadow-[0_0_20px_rgba(74,222,128,0.3)]',
  raise: 'border-gold/50 bg-gold/12 text-gold-light shadow-glow-gold',
  bid: 'border-violet-400/45 bg-violet-500/12 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  playCard: 'border-violet-400/45 bg-violet-500/12 text-violet-200 shadow-[0_0_20px_rgba(167,139,250,0.35)]',
  blindSB: 'border-gold/35 bg-gold/10 text-gold-light/90 shadow-[0_0_16px_rgba(232,197,71,0.25)]',
  blindBB: 'border-gold/45 bg-gold/15 text-gold-light shadow-glow-gold'
};
