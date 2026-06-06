import type { Card, JokerHandState, PlayerAction, SessionState, Suit } from '@duopoker/shared-types/index';
import { jokerCardsPerHand, jokerPoolLabel } from './joker-schedule';
import { createJokerDeck, JOKER_WILD_IDS } from './joker-deck';
import { jokerPointsForHand } from './joker-scoring';
import { cardSuit, isJokerCard, legalPlays, trickWinnerIndex } from './joker-trick';
import { shuffle } from './cards';
import type { SeededRng } from './rng';

const nextSeat = (n: number, from: number): number => (from + 1) % n;

const leftOfDealer = (state: SessionState): number =>
  nextSeat(state.players.length, state.dealerIndex);

const dealFromDeck = (
  deck: Card[],
  players: string[],
  count: number
): { playerCards: Record<string, Card[]>; deck: Card[] } => {
  const playerCards: Record<string, Card[]> = Object.fromEntries(players.map((p) => [p, []]));
  let d = [...deck];
  for (let round = 0; round < count; round += 1) {
    for (const p of players) {
      if (d.length) {
        playerCards[p] = [...(playerCards[p] ?? []), d[0]!];
        d = d.slice(1);
      }
    }
  }
  return { playerCards, deck: d };
};

const revealTrump = (
  deck: Card[]
): { trumpCard?: Card; trumpSuit: Suit | null; deck: Card[] } => {
  if (!deck.length) return { trumpSuit: null, deck };
  const trumpCard = deck[0]!;
  const d = deck.slice(1);
  if (isJokerCard(trumpCard)) {
    return { trumpCard, trumpSuit: null, deck: d };
  }
  return { trumpCard, trumpSuit: cardSuit(trumpCard), deck: d };
};

const emptyJokerScores = (players: string[], prev?: Record<string, number>): Record<string, number> =>
  Object.fromEntries(players.map((p) => [p, prev?.[p] ?? 0]));

const allBidsPlaced = (j: JokerHandState, players: string[]): boolean =>
  players.every((p) => j.bids[p] !== undefined);

const maxBid = (cardsThisDeal: number): number => Math.min(9, cardsThisDeal);

const withHandComplete = (state: SessionState): SessionState => ({
  ...state,
  handCompletedAt: Date.now(),
  actionDeadlineAt: undefined
});

export const startJokerHand = (
  state: SessionState,
  dealerIndex: number,
  rng: SeededRng
): SessionState => {
  const matchHandIndex = state.handNumber % 24;
  const cardsThisDeal = jokerCardsPerHand(matchHandIndex);
  const shuffled = shuffle(createJokerDeck(), rng);
  const { playerCards, deck: afterDeal } = dealFromDeck(shuffled, state.players, cardsThisDeal);
  const { trumpCard, trumpSuit, deck } = revealTrump(afterDeal);
  const prevScores = state.joker?.scores;
  const joker: JokerHandState = {
    matchHandIndex,
    cardsThisDeal,
    pool: jokerPoolLabel(matchHandIndex),
    trumpSuit,
    trumpCard,
    bids: {},
    tricksWon: Object.fromEntries(state.players.map((p) => [p, 0])),
    currentTrick: [],
    trickNumber: 0,
    scores: emptyJokerScores(state.players, prevScores)
  };
  const firstBidder = leftOfDealer({ ...state, dealerIndex });
  return {
    ...state,
    dealerIndex,
    handNumber: state.handNumber + 1,
    street: 'BIDDING',
    phase: 'DEAL',
    communityCards: trumpCard ? [trumpCard] : [],
    foldedPlayerIds: [],
    playerCards,
    deck,
    pot: 0,
    currentBet: 0,
    playerRoundBet: Object.fromEntries(state.players.map((p) => [p, 0])),
    lastAggressor: null,
    allInPlayerIds: [],
    actedThisRound: Object.fromEntries(state.players.map((p) => [p, false])),
    handContributions: Object.fromEntries(state.players.map((p) => [p, 0])),
    readyForNextHand: [],
    activePlayerIndex: firstBidder,
    activePlayerId: state.players[firstBidder],
    actionLog: [],
    winners: undefined,
    winnersShare: undefined,
    ghostCommunityCards: undefined,
    joker
  };
};

const rotateActive = (state: SessionState): SessionState => {
  const next = nextSeat(state.players.length, state.activePlayerIndex);
  return { ...state, activePlayerIndex: next, activePlayerId: state.players[next] };
};

const beginTricks = (state: SessionState): SessionState => {
  const leader = leftOfDealer(state);
  return {
    ...state,
    street: 'TRICKS',
    phase: 'PRE_FLOP',
    activePlayerIndex: leader,
    activePlayerId: state.players[leader],
    joker: state.joker
      ? { ...state.joker, currentTrick: [], trickNumber: 0 }
      : state.joker
  };
};

const finishTrick = (state: SessionState): SessionState => {
  const j = state.joker!;
  const winnerIdx = trickWinnerIndex(j.currentTrick, state.players, j.trumpSuit);
  const winnerId = state.players[winnerIdx]!;
  const tricksWon = { ...j.tricksWon, [winnerId]: (j.tricksWon[winnerId] ?? 0) + 1 };
  const trickNumber = j.trickNumber + 1;
  const handDone = trickNumber >= j.cardsThisDeal;

  if (!handDone) {
    return {
      ...state,
      activePlayerIndex: winnerIdx,
      activePlayerId: winnerId,
      joker: { ...j, tricksWon, currentTrick: [], trickNumber }
    };
  }

  const handPoints: Record<string, number> = {};
  const scores = { ...j.scores };
  for (const p of state.players) {
    const bid = j.bids[p] ?? 0;
    const taken = tricksWon[p] ?? 0;
    const pts = jokerPointsForHand(bid, taken, j.cardsThisDeal);
    handPoints[p] = pts;
    scores[p] = (scores[p] ?? 0) + pts;
  }

  const best = state.players.reduce((a, b) => ((scores[a] ?? 0) >= (scores[b] ?? 0) ? a : b));
  return withHandComplete({
    ...state,
    street: 'COMPLETE',
    phase: 'SHOWDOWN',
    winners: [best],
    winnersShare: handPoints,
    activePlayerIndex: state.dealerIndex,
    activePlayerId: state.players[state.dealerIndex],
    joker: { ...j, tricksWon, currentTrick: [], trickNumber, scores, handPoints }
  });
};

const applyBid = (state: SessionState, userId: string, amount: number, action: PlayerAction): SessionState => {
  const j = state.joker!;
  const max = maxBid(j.cardsThisDeal);
  const bid = Math.max(0, Math.min(max, Math.floor(amount)));
  const bids = { ...j.bids, [userId]: bid };
  let ns: SessionState = {
    ...state,
    actionLog: [...state.actionLog, action],
    joker: { ...j, bids }
  };

  if (!allBidsPlaced({ ...j, bids }, state.players)) {
    return rotateActive(ns);
  }

  const dealerId = state.players[state.dealerIndex]!;
  const others = state.players.filter((p) => p !== dealerId);
  const dealerBid = bids[dealerId];
  const othersSum = others.reduce((s, p) => s + (bids[p] ?? 0), 0);
  if (dealerBid !== undefined && dealerBid + othersSum === j.cardsThisDeal) {
    const adjusted = Math.min(max, dealerBid + 1);
    ns = {
      ...ns,
      joker: { ...ns.joker!, bids: { ...bids, [dealerId]: adjusted } }
    };
  }

  return beginTricks(ns);
};

const applyPlayCard = (state: SessionState, userId: string, card: Card, action: PlayerAction): SessionState => {
  const j = state.joker!;
  const hand = state.playerCards[userId] ?? [];
  if (!hand.includes(card)) {
    throw new Error('CARD_NOT_IN_HAND');
  }
  const leadSuit =
    j.currentTrick.length === 0
      ? null
      : isJokerCard(j.currentTrick[0]!.card)
        ? null
        : cardSuit(j.currentTrick[0]!.card);
  const allowed = legalPlays(hand, leadSuit, j.trumpSuit);
  if (!allowed.includes(card)) {
    throw new Error('ILLEGAL_CARD');
  }

  const playerCards = {
    ...state.playerCards,
    [userId]: hand.filter((c) => c !== card)
  };
  const currentTrick = [...j.currentTrick, { userId, card }];
  const ns: SessionState = {
    ...state,
    playerCards,
    actionLog: [...state.actionLog, action],
    joker: { ...j, currentTrick }
  };

  if (currentTrick.length < state.players.length) {
    return rotateActive(ns);
  }
  return finishTrick(ns);
};

export const applyJokerAction = (
  state: SessionState,
  action: PlayerAction
): { ok: true; state: SessionState } | { ok: false; reason: string } => {
  if (!state.joker) return { ok: false, reason: 'NO_JOKER_STATE' };
  if (state.street !== 'BIDDING' && state.street !== 'TRICKS') {
    return { ok: false, reason: 'NO_ACTIVE_HAND' };
  }

  const cur = state.players[state.activePlayerIndex];
  if (cur !== action.userId) return { ok: false, reason: 'WRONG_TURN' };

  try {
    if (state.street === 'BIDDING') {
      if (action.type !== 'bid') return { ok: false, reason: 'INVALID_ACTION' };
      return { ok: true, state: applyBid(state, action.userId, action.amount ?? 0, action) };
    }
    if (action.type !== 'playCard' || !action.card) {
      return { ok: false, reason: 'INVALID_ACTION' };
    }
    return { ok: true, state: applyPlayCard(state, action.userId, action.card, action) };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'INVALID_ACTION';
    return { ok: false, reason };
  }
};

export const pickBotJokerAction = (state: SessionState, userId: string): PlayerAction => {
  const at = Date.now();
  const base = { sessionId: state.sessionId, userId, at };
  const j = state.joker!;

  if (state.street === 'BIDDING') {
    const max = maxBid(j.cardsThisDeal);
    const bid = Math.floor(Math.random() * (max + 1));
    return { ...base, type: 'bid', amount: bid };
  }

  const hand = state.playerCards[userId] ?? [];
  const leadSuit =
    j.currentTrick.length === 0
      ? null
      : isJokerCard(j.currentTrick[0]!.card)
        ? null
        : cardSuit(j.currentTrick[0]!.card);
  const allowed = legalPlays(hand, leadSuit, j.trumpSuit);
  const card = allowed[0] ?? hand[0]!;
  return { ...base, type: 'playCard', card };
};

export const jokerTimeoutAction = (state: SessionState, userId: string): PlayerAction =>
  state.street === 'BIDDING'
    ? { sessionId: state.sessionId, userId, type: 'bid', amount: 0, at: Date.now() }
    : pickBotJokerAction(state, userId);

export { JOKER_WILD_IDS };
