import type { Card, SessionState } from '@duopoker/shared-types/index';
import { createDeck, shuffle } from './cards';
import { createJokerDeck } from './joker-deck';
import { jokerCardsPerHand } from '@duopoker/shared-types/index';
import { compareStrength, strengthFiveFromHand, bestStrengthFromSeven, parseCard } from './poker-eval';
import { createInitialTableState } from './holdem-table';
import { SeededRng, mixHandSeed } from './rng';

/** @deprecated use createInitialTableState */
export const createInitialState = (sessionId: string, mode: SessionState['mode']): SessionState =>
  createInitialTableState(sessionId, mode, 100, Date.now());

export const dealToPlayers = (state: SessionState, playerIds: string[], seed?: number): SessionState => {
  const rng = new SeededRng(seed ?? mixHandSeed(state.seed ?? Date.now(), state.handNumber));
  const cardsPerPlayer =
    state.mode === 'HOLDEM' ? 2 : jokerCardsPerHand(Math.max(0, state.handNumber));
  const deck = shuffle(state.mode === 'HOLDEM' ? createDeck() : createJokerDeck(), rng);
  const playerCards = {} as Record<string, Card[]>;
  let d = deck;
  playerIds.forEach((id) => {
    playerCards[id] = [];
  });
  for (let c = 0; c < cardsPerPlayer; c += 1) {
    playerIds.forEach((id) => {
      if (d.length) {
        playerCards[id] = [...(playerCards[id] ?? []), d[0]! as Card];
        d = d.slice(1);
      }
    });
  }
  return { ...state, playerCards, deck: d as Card[], seed: seed ?? state.seed ?? mixHandSeed(Date.now(), state.handNumber) };
};

export const isLegalAction = (state: SessionState, action: import('@duopoker/shared-types/index').PlayerAction): boolean => {
  if (state.foldedPlayerIds?.includes(action.userId)) return false;
  if (action.type === 'check') return (action.amount ?? 0) === 0;
  return true;
};

export const resolveWinner = (state: SessionState): { winnerId?: string; score: number } => {
  const folded = new Set(state.foldedPlayerIds ?? []);
  const alive = state.players.filter((p) => !folded.has(p));
  if (alive.length === 0) return { score: 0 };
  if (alive.length === 1) return { winnerId: alive[0], score: 1 };

  let best: string | undefined;
  let bestCmp = -1;
  for (const uid of alive) {
    const hole = state.playerCards[uid] ?? [];
    const s =
      state.mode === 'HOLDEM'
        ? bestStrengthFromSeven(hole, state.communityCards)
        : hole.length >= 5
          ? strengthFiveFromHand(hole)
          : ([0, ...hole.map((c) => parseCard(c).rank).sort((a, b) => b - a)] as const);
    const cmp = s[0] ?? 0;
    if (best === undefined) {
      best = uid;
      bestCmp = cmp;
      continue;
    }
    const prev =
      state.mode === 'HOLDEM'
        ? bestStrengthFromSeven(state.playerCards[best] ?? [], state.communityCards)
        : strengthFiveFromHand(state.playerCards[best] ?? []);
    if (compareStrength(s, prev) > 0) {
      bestCmp = cmp;
      best = uid;
    }
  }
  return { winnerId: best, score: bestCmp };
};
