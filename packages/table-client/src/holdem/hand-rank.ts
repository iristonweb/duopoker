import type { SessionState } from '@duopoker/shared-types/index';
import { bestStrengthFromSeven } from '@duopoker/game-engine';

type HandStrength = readonly number[];

const HAND_KEYS = [
  'holdemHighCard',
  'holdemPair',
  'holdemTwoPair',
  'holdemTrips',
  'holdemStraight',
  'holdemFlush',
  'holdemFullHouse',
  'holdemQuads',
  'holdemStraightFlush'
] as const;

const INDEX_TO_RANK = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

type Translate = (key: string, opts?: Record<string, unknown>) => string;

const rankLabel = (idx: number, t: Translate): string => {
  const r = INDEX_TO_RANK[idx];
  if (!r) return String(idx);
  if (r === 'T') return t('table.cardRank10');
  if (r === 'J' || r === 'Q' || r === 'K' || r === 'A') return t(`table.cardRank${r}`);
  return r;
};

export const describeHoldemStrength = (strength: HandStrength, t: Translate): string => {
  const cat = strength[0] ?? 0;
  const key = HAND_KEYS[cat] ?? HAND_KEYS[0];
  const base = t(`table.${key}`);
  if (cat === 4 || cat === 8) {
    const high = strength[1];
    if (high !== undefined) {
      return t('table.holdemStraightHigh', { hand: base, rank: rankLabel(high, t) });
    }
  }
  return base;
};

export const holdemShowdownHandLines = (
  session: Pick<SessionState, 'mode' | 'street' | 'winners' | 'playerCards' | 'communityCards' | 'foldedPlayerIds'>,
  label: (uid: string) => string,
  t: Translate
): string | undefined => {
  if (session.mode !== 'HOLDEM' || session.street !== 'COMPLETE') return undefined;
  const board = session.communityCards ?? [];
  if (board.length < 5) return undefined;
  const winners = session.winners ?? [];
  if (!winners.length) return undefined;

  const folded = new Set(session.foldedPlayerIds ?? []);
  const lines = winners
    .map((uid) => {
      const hole = session.playerCards[uid];
      if (!hole || hole.length < 2 || folded.has(uid)) return null;
      const strength = bestStrengthFromSeven(hole, board);
      return t('table.holdemWinnerHand', {
        name: label(uid),
        hand: describeHoldemStrength(strength, t)
      });
    })
    .filter(Boolean);

  return lines.length ? lines.join(' · ') : undefined;
};
