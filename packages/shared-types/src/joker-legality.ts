type Suit = 'S' | 'H' | 'D' | 'C';
type Card = string;
type Rank = '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

/** Wild jokers per classic rules: 6♠ and 6♣. */
export const JOKER_WILD_IDS = ['6S', '6C'] as const;

export const isJokerCard = (c: Card): boolean =>
  (JOKER_WILD_IDS as readonly string[]).includes(c);

export const cardSuit = (c: Card): Suit => c[1] as Suit;

const RANK_ORDER: Rank[] = ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export const cardRankIndex = (c: Card): number => {
  const r = c[0] as Rank;
  const i = RANK_ORDER.indexOf(r);
  return i >= 0 ? i : 0;
};

export type JokerLeadDeclaration =
  | 'nominal'
  | 'senior'
  | 'minor'
  | { suit: Suit; rankMode: 'senior' | 'minor' };

export type TrickLeadInfo = {
  suit: Suit | null;
  /** When lead was a suit-forcing joker («по старшим/младшим …»). */
  rankMode?: 'senior' | 'minor';
};

/** Lead suit is the first non-joker card played in the trick. */
export const leadSuitFromTrick = (trick: readonly { card: Card }[]): Suit | null => {
  for (const { card } of trick) {
    if (!isJokerCard(card)) return cardSuit(card);
  }
  return null;
};

/**
 * Effective lead for legality and trick resolution.
 * Suit-forcing joker lead ({ suit, rankMode }) sets the suit partners must follow.
 */
export const leadInfoFromTrick = (
  trick: readonly { card: Card; declaration?: JokerLeadDeclaration }[]
): TrickLeadInfo => {
  const first = trick[0];
  if (!first) return { suit: null };
  if (
    isJokerCard(first.card) &&
    first.declaration &&
    typeof first.declaration === 'object' &&
    'suit' in first.declaration
  ) {
    return { suit: first.declaration.suit, rankMode: first.declaration.rankMode };
  }
  return { suit: leadSuitFromTrick(trick) };
};

/**
 * Legal cards to play per classic «расписной» rules:
 * - Jokers may be played at any time.
 * - Must follow lead suit when possible (jokers do not count as holding the suit).
 * - When void in lead suit, must play a real trump if any; jokers are not trump for this check
 *   (except when played «по номиналу» as 6♠/6♣ — that is a declaration choice, not a hold).
 * - When void in lead and void of real trump, any card may be dumped (joker optional).
 * - After suit-force joker lead with rankMode, must play highest/lowest of that suit.
 */
const baseLegalPlays = (hand: Card[], leadSuit: Suit | null, trumpSuit: Suit | null): Card[] => {
  if (!hand.length) return [];
  const jokers = hand.filter(isJokerCard);
  if (!leadSuit) return [...hand];

  const follow = hand.filter((c) => !isJokerCard(c) && cardSuit(c) === leadSuit);
  if (follow.length > 0) return [...follow, ...jokers];

  if (trumpSuit) {
    const trumps = hand.filter((c) => !isJokerCard(c) && cardSuit(c) === trumpSuit);
    if (trumps.length > 0) return [...trumps, ...jokers];
  }

  return [...hand];
};

export const jokerLegalPlays = (
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  strictJoker = false,
  rankMode?: 'senior' | 'minor'
): Card[] => {
  let legal = baseLegalPlays(hand, leadSuit, trumpSuit);
  if (strictJoker && leadSuit === null) {
    const hasNonJoker = hand.some((c) => !isJokerCard(c));
    if (hasNonJoker) {
      legal = legal.filter((c) => !isJokerCard(c));
    }
  }

  if (rankMode && leadSuit) {
    const ofSuit = legal.filter((c) => !isJokerCard(c) && cardSuit(c) === leadSuit);
    if (ofSuit.length > 0) {
      const sorted = [...ofSuit].sort((a, b) => cardRankIndex(a) - cardRankIndex(b));
      const required = rankMode === 'senior' ? sorted[sorted.length - 1]! : sorted[0]!;
      const jokers = legal.filter(isJokerCard);
      legal = [required, ...jokers];
    }
  }

  return legal;
};

/**
 * After void-suit dumps with no trump, nominal 6♠/6♣ is forbidden
 * (club rules: cannot appoint joker as a six that would act as trump suit).
 */
export const isNominalTrumpBanned = (
  card: Card,
  _trumpSuit: Suit | null,
  voidTrumpDiscards?: boolean
): boolean => Boolean(voidTrumpDiscards && isJokerCard(card));

export const normalizeJokerCard = (raw: string): Card | null => {
  const c = raw.trim().toUpperCase();
  if (!/^[6-9TJQKA][SHDC]$/.test(c)) return null;
  return c;
};
