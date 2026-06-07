import type { Card, PlayerAction } from '@duopoker/shared-types/index';
import { formatJokerPlayLine } from '../joker/declaration-label';

export type SeatActionKind =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'allIn'
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
      return action.allIn
        ? { kind: 'allIn', label: t('table.actionAllIn', { amount: action.amount ?? 0 }) }
        : { kind: 'call', label: t('table.actionCall', { amount: action.amount ?? 0 }) };
    case 'bet':
      return action.allIn
        ? { kind: 'allIn', label: t('table.actionAllIn', { amount: action.amount ?? 0 }) }
        : { kind: 'bet', label: t('table.actionBet', { amount: action.amount ?? 0 }) };
    case 'raise':
      return action.allIn
        ? { kind: 'allIn', label: t('table.actionAllIn', { amount: action.amount ?? 0 }) }
        : {
            kind: 'raise',
            label: t('table.actionRaise', { amount: action.raiseBy ?? action.amount ?? 0 })
          };
    case 'bid':
      return { kind: 'bid', label: t('table.actionBid', { amount: action.amount ?? 0 }) };
    case 'playCard': {
      const cardLabel = action.card
        ? cardFormatter
          ? cardFormatter(action.card)
          : action.card
        : t('table.actionPlay');
      const label =
        action.card && action.declaration
          ? formatJokerPlayLine(cardLabel, action.declaration, t)
          : cardLabel;
      return { kind: 'playCard', label };
    }
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
  allIn: '★',
  bid: '♠',
  playCard: '♣',
  blindSB: 'SB',
  blindBB: 'BB'
};
