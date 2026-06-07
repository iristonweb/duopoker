type Suit = 'S' | 'H' | 'D' | 'C';
type Card = string;

/** Wild jokers per classic rules: 6♠ and 6♣. */
export const JOKER_WILD_IDS = ['6S', '6C'] as const;

export const isJokerCard = (c: Card): boolean =>
  (JOKER_WILD_IDS as readonly string[]).includes(c);

export const cardSuit = (c: Card): Suit => c[1] as Suit;

/** Lead suit is the first non-joker card played in the trick. */
export const leadSuitFromTrick = (trick: readonly { card: Card }[]): Suit | null => {
  for (const { card } of trick) {
    if (!isJokerCard(card)) return cardSuit(card);
  }
  return null;
};

/**
 * Legal cards to play per rules:
 * - Jokers may be played at any time.
 * - Must follow lead suit when possible (jokers do not count as holding the suit).
 * - When void in lead suit, must play trump if any (including jokers).
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
    if (jokers.length > 0) return [...jokers];
  }

  return [...hand];
};

export const jokerLegalPlays = (
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  strictJoker = false
): Card[] => {
  let legal = baseLegalPlays(hand, leadSuit, trumpSuit);
  if (!strictJoker || leadSuit !== null) return legal;
  const hasNonJoker = hand.some((c) => !isJokerCard(c));
  if (hasNonJoker) {
    legal = legal.filter((c) => !isJokerCard(c));
  }
  return legal;
};

/** After void-suit dumps with no trump, nominal 6♠/6♣ as trump suit is forbidden. */
export const isNominalTrumpBanned = (
  card: Card,
  trumpSuit: Suit | null,
  voidTrumpDiscards?: boolean
): boolean =>
  Boolean(
    voidTrumpDiscards &&
      trumpSuit &&
      isJokerCard(card) &&
      cardSuit(card) === trumpSuit
  );

export const normalizeJokerCard = (raw: string): Card | null => {
  const c = raw.trim().toUpperCase();
  if (!/^[6-9TJQKA][SHDC]$/.test(c)) return null;
  return c;
};
