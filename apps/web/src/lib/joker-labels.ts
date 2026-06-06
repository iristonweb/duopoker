import type { Card, JokerHandState, Suit } from '@duopoker/shared-types/index';

const SUIT_SYMBOLS: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set<Suit>(['H', 'D']);

type Translate = (key: string, opts?: Record<string, unknown>) => string;

const RANK_I18N_KEYS: Record<string, string> = {
  T: 'table.cardRank10',
  J: 'table.cardRankJ',
  Q: 'table.cardRankQ',
  K: 'table.cardRankK',
  A: 'table.cardRankA'
};

export const formatCardLabel = (card: Card, t: Translate): string => {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1) as Suit;
  const rankLabel = RANK_I18N_KEYS[rank] ? t(RANK_I18N_KEYS[rank]!) : rank;
  const suitSym = SUIT_SYMBOLS[suit] ?? suit;
  return `${rankLabel}${suitSym}`;
};

export const suitSymbol = (s: Suit): string => SUIT_SYMBOLS[s] ?? s;

export const suitLabel = (s: Suit, t: Translate): string => {
  const map: Record<Suit, string> = {
    S: t('table.suitSpades'),
    H: t('table.suitHearts'),
    D: t('table.suitDiamonds'),
    C: t('table.suitClubs')
  };
  return map[s] ?? s;
};

export const isRedSuit = (s: Suit): boolean => RED_SUITS.has(s);

export type JokerTrumpDisplay = {
  /** Localized line, e.g. "Козырь: ♥ черви" */
  line: string;
  /** Suit symbol + name, or "Без козыря" */
  value: string;
  suit: Suit | null;
  noTrump: boolean;
  /** Shown when a joker was turned — trump suit not set yet */
  hint?: string;
};

export const jokerTrumpDisplay = (
  joker: Pick<JokerHandState, 'trumpSuit' | 'trumpCard'>,
  t: Translate
): JokerTrumpDisplay => {
  if (joker.trumpSuit) {
    const value = `${suitSymbol(joker.trumpSuit)} ${suitLabel(joker.trumpSuit, t)}`;
    return {
      line: t('table.jokerTrump', { trump: value }),
      value,
      suit: joker.trumpSuit,
      noTrump: false
    };
  }
  const value = t('table.jokerNoTrump');
  return {
    line: t('table.jokerTrump', { trump: value }),
    value,
    suit: null,
    noTrump: true,
    hint: joker.trumpCard ? t('table.jokerNoTrumpHint') : undefined
  };
};
