import type {
  Card,
  JokerHandState,
  JokerTrickPlay,
  PlayerAction,
  SessionState,
  Suit
} from '@duopoker/shared-types/index';
import { isNominalTrumpBanned, jokerCardsPerHand, jokerPoolLabel } from '@duopoker/shared-types/index';
import { createJokerDeck } from './joker-deck';
import { applyPoolPremiums, isPoolEndHand, jokerPointsForHand } from './joker-scoring';
import {
  cardSuit,
  isJokerCard,
  jokerLegalPlays,
  leadSuitFromTrick,
  normalizeJokerCard,
  trickWinnerIndex
} from './joker-trick';
import { shuffle } from './cards';
import { SeededRng } from './rng';

const botRng = (state: SessionState, userId: string): SeededRng => {
  const salt = userId.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return new SeededRng(state.seed + state.handNumber * 997 + salt);
};

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

const needsTrumpChoice = (pool: 1 | 2 | 3 | 4, cardsThisDeal: number): boolean =>
  (pool === 2 || pool === 4) && cardsThisDeal === 9;

const withHandComplete = (state: SessionState): SessionState => ({
  ...state,
  handCompletedAt: Date.now(),
  actionDeadlineAt: undefined
});

const isAce = (c: Card): boolean => c[0] === 'A';

/** Tuzovanie: reveal cards clockwise until a player receives an ace. */
export const runTuzovanie = (
  state: SessionState,
  rng: SeededRng
): { dealerIndex: number; log: { userId: string; card: Card }[] } => {
  const deck = shuffle(createJokerDeck(), rng);
  const log: { userId: string; card: Card }[] = [];
  let deckIdx = 0;
  let seat = 0;
  while (deckIdx < deck.length) {
    const userId = state.players[seat]!;
    const card = deck[deckIdx++]!;
    log.push({ userId, card });
    if (isAce(card)) {
      return { dealerIndex: seat, log };
    }
    seat = nextSeat(state.players.length, seat);
  }
  return { dealerIndex: 0, log };
};

const bidSum = (bids: Record<string, number | undefined>, players: string[]): number =>
  players.reduce((s, p) => s + (bids[p] ?? 0), 0);

const dealerBidBlocked = (
  bid: number,
  bids: Record<string, number | undefined>,
  players: string[],
  dealerId: string,
  cardsThisDeal: number
): boolean => {
  const temp = { ...bids, [dealerId]: bid };
  if (!players.every((p) => p === dealerId || temp[p] !== undefined)) return false;
  return bidSum(temp, players) === cardsThisDeal;
};

/** Auto-correct dealer bid for bots/timeouts only. */
export const correctDealerBidForBot = (
  bid: number,
  bids: Record<string, number | undefined>,
  players: string[],
  dealerIndex: number,
  cardsThisDeal: number
): number => {
  const dealerId = players[dealerIndex]!;
  const max = Math.min(9, cardsThisDeal);
  if (!dealerBidBlocked(bid, bids, players, dealerId, cardsThisDeal)) return bid;
  if (bid < max) return bid + 1;
  if (bid > 0) return bid - 1;
  const other = players.find((p) => p !== dealerId && (bids[p] ?? 0) > 0);
  if (other) return bid;
  return 0;
};

export const startJokerHand = (
  state: SessionState,
  dealerIndex: number,
  rng: SeededRng
): SessionState => {
  let dealer = dealerIndex;
  let tuzovanieRevealed: Record<string, Card[]> | undefined;
  let tuzovanieLog = state.joker?.tuzovanieLog;

  if (state.handNumber === 0) {
    const tuz = runTuzovanie(state, rng);
    dealer = tuz.dealerIndex;
    tuzovanieLog = tuz.log;
    const revealed: Record<string, Card[]> = {};
    for (const e of tuz.log) {
      revealed[e.userId] = [...(revealed[e.userId] ?? []), e.card];
    }
    tuzovanieRevealed = revealed;
  }

  const matchHandIndex = state.handNumber % 24;
  const cardsThisDeal = jokerCardsPerHand(matchHandIndex);
  const pool = jokerPoolLabel(matchHandIndex);
  const shuffled = shuffle(createJokerDeck(), rng);
  const trumpChoice = needsTrumpChoice(pool, cardsThisDeal);
  const initialDealCount = trumpChoice ? 3 : cardsThisDeal;
  const { playerCards, deck: afterDeal } = dealFromDeck(shuffled, state.players, initialDealCount);

  const prevScores = state.joker?.scores;
  const dealHistory = state.joker?.dealHistory ?? [];
  const poolPremiums = state.joker?.poolPremiums;

  const baseJoker: JokerHandState = {
    matchHandIndex,
    cardsThisDeal,
    pool,
    trumpSuit: null,
    bids: {},
    tricksWon: Object.fromEntries(state.players.map((p) => [p, 0])),
    currentTrick: [],
    trickNumber: 0,
    scores: emptyJokerScores(state.players, prevScores),
    dealHistory,
    tuzovanieRevealed,
    tuzovanieLog,
    poolPremiums
  };

  if (trumpChoice) {
    const chooser = leftOfDealer({ ...state, dealerIndex: dealer });
    return {
      ...state,
      dealerIndex: dealer,
      handNumber: state.handNumber + 1,
      street: 'TRUMP_CHOICE',
      phase: 'DEAL',
      communityCards: [],
      foldedPlayerIds: [],
      playerCards,
      deck: afterDeal,
      pot: 0,
      currentBet: 0,
      playerRoundBet: Object.fromEntries(state.players.map((p) => [p, 0])),
      lastAggressor: null,
      lastRaiseSize: state.bigBlind,
      allInPlayerIds: [],
      actedThisRound: Object.fromEntries(state.players.map((p) => [p, false])),
      handContributions: Object.fromEntries(state.players.map((p) => [p, 0])),
      readyForNextHand: [],
      activePlayerIndex: chooser,
      activePlayerId: state.players[chooser],
      actionLog: [],
      winners: undefined,
      winnersShare: undefined,
      ghostCommunityCards: undefined,
      joker: baseJoker
    };
  }

  const { trumpCard, trumpSuit, deck } = revealTrump(afterDeal);
  const firstBidder = leftOfDealer({ ...state, dealerIndex: dealer });

  return {
    ...state,
    dealerIndex: dealer,
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
    lastRaiseSize: state.bigBlind,
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
    joker: { ...baseJoker, trumpSuit, trumpCard, firstBidderIndex: firstBidder, voidTrumpDiscards: false }
  };
};

const rotateActive = (state: SessionState): SessionState => {
  const next = nextSeat(state.players.length, state.activePlayerIndex);
  return { ...state, activePlayerIndex: next, activePlayerId: state.players[next] };
};

const beginTricks = (state: SessionState): SessionState => {
  const leader = state.joker?.firstBidderIndex ?? leftOfDealer(state);
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

const trickHadVoidDump = (plays: JokerTrickPlay[], trumpSuit: Suit | null): boolean => {
  if (trumpSuit !== null) return false;
  const lead = leadSuitFromTrick(plays);
  if (lead === null) return false;
  return plays.some((p) => {
    if (isJokerCard(p.card)) return false;
    const suit = cardSuit(p.card);
    return suit !== lead;
  });
};

const finishTrick = (state: SessionState): SessionState => {
  const j = state.joker!;
  const winnerIdx = trickWinnerIndex(j.currentTrick, state.players, j.trumpSuit);
  const winnerId = state.players[winnerIdx]!;
  const tricksWon = { ...j.tricksWon, [winnerId]: (j.tricksWon[winnerId] ?? 0) + 1 };
  const trickNumber = j.trickNumber + 1;
  const handDone = trickNumber >= j.cardsThisDeal;

  if (!handDone) {
    const voidDump = trickHadVoidDump(j.currentTrick, j.trumpSuit);
    return {
      ...state,
      activePlayerIndex: winnerIdx,
      activePlayerId: winnerId,
      joker: {
        ...j,
        tricksWon,
        currentTrick: [],
        trickNumber,
        lastTrickWinner: winnerId,
        voidTrumpDiscards: j.voidTrumpDiscards || voidDump
      }
    };
  }

  const handPoints: Record<string, number> = {};
  let scores = { ...j.scores };
  for (const p of state.players) {
    const bid = j.bids[p] ?? 0;
    const taken = tricksWon[p] ?? 0;
    const pts = jokerPointsForHand(
      bid,
      taken,
      j.cardsThisDeal,
      state.jokerRules?.scoringMode ?? 'classic'
    );
    handPoints[p] = pts;
    scores[p] = (scores[p] ?? 0) + pts;
  }

  const bids: Record<string, number> = {};
  for (const p of state.players) {
    bids[p] = j.bids[p] ?? 0;
  }
  const dealRecord = {
    matchHandIndex: j.matchHandIndex,
    pool: j.pool,
    cardsThisDeal: j.cardsThisDeal,
    bids,
    tricksWon: { ...tricksWon },
    handPoints: { ...handPoints }
  };
  const dealHistory = [...(j.dealHistory ?? []), dealRecord];
  let poolPremiums = { ...j.poolPremiums };
  const endPool = isPoolEndHand(j.matchHandIndex);
  if (endPool) {
    const applied = applyPoolPremiums(endPool, dealHistory, state.players, scores);
    scores = applied.scores;
    poolPremiums = { ...poolPremiums, ...applied.premiums };
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
    joker: {
      ...j,
      tricksWon,
      currentTrick: [],
      trickNumber,
      scores,
      handPoints,
      dealHistory,
      poolPremiums,
      lastTrickWinner: winnerId
    }
  });
};

const applyChooseTrump = (
  state: SessionState,
  userId: string,
  trumpSuit: Suit | null,
  action: PlayerAction
): SessionState => {
  const j = state.joker!;
  const chooser = state.players[leftOfDealer(state)]!;
  if (userId !== chooser) {
    throw new Error('WRONG_PLAYER');
  }

  const remaining = j.cardsThisDeal - 3;
  const { playerCards, deck: afterMore } = dealFromDeck(state.deck, state.players, remaining);
  const mergedCards: Record<string, Card[]> = {};
  for (const p of state.players) {
    mergedCards[p] = [...(state.playerCards[p] ?? []), ...(playerCards[p] ?? [])];
  }

  const { trumpCard, deck } = revealTrump(afterMore);
  const resolvedTrump: Suit | null = trumpSuit === undefined ? null : trumpSuit;

  const firstBidder = leftOfDealer(state);
  return {
    ...state,
    street: 'BIDDING',
    communityCards: trumpCard ? [trumpCard] : [],
    playerCards: mergedCards,
    deck,
    actionLog: [...state.actionLog, action],
    activePlayerIndex: firstBidder,
    activePlayerId: state.players[firstBidder],
    joker: {
      ...j,
      trumpSuit: resolvedTrump,
      trumpCard,
      firstBidderIndex: firstBidder,
      voidTrumpDiscards: false
    }
  };
};

const applyBid = (state: SessionState, userId: string, amount: number, action: PlayerAction): SessionState => {
  const j = state.joker!;
  const max = maxBid(j.cardsThisDeal);
  const bid = Math.max(0, Math.min(max, Math.floor(amount)));
  const dealerId = state.players[state.dealerIndex]!;

  if (userId === dealerId && dealerBidBlocked(bid, j.bids, state.players, dealerId, j.cardsThisDeal)) {
    throw new Error('DEALER_BID_BLOCKED');
  }

  const bids = { ...j.bids, [userId]: bid };
  const ns: SessionState = {
    ...state,
    actionLog: [...state.actionLog, action],
    joker: { ...j, bids }
  };

  if (!allBidsPlaced({ ...j, bids }, state.players)) {
    return rotateActive(ns);
  }

  return beginTricks(ns);
};

const applyPlayCard = (
  state: SessionState,
  userId: string,
  cardRaw: Card,
  action: PlayerAction
): SessionState => {
  const card = normalizeJokerCard(cardRaw) ?? cardRaw;
  const j = state.joker!;
  const hand = state.playerCards[userId] ?? [];
  const idx = hand.indexOf(card);
  if (idx < 0) {
    throw new Error('CARD_NOT_IN_HAND');
  }
  const leadSuit = leadSuitFromTrick(j.currentTrick);
  const allowed = jokerLegalPlays(hand, leadSuit, j.trumpSuit, state.jokerRules?.strictJoker);
  if (!allowed.includes(card)) {
    throw new Error('ILLEGAL_CARD');
  }

  if (isJokerCard(card) && action.declaration === undefined) {
    throw new Error('JOKER_DECLARATION_REQUIRED');
  }
  const declaration = isJokerCard(card) ? action.declaration : undefined;
  if (isJokerCard(card) && declaration === 'nominal' && isNominalTrumpBanned(card, j.trumpSuit, j.voidTrumpDiscards)) {
    throw new Error('NOMINAL_TRUMP_BANNED');
  }

  const playerCards = {
    ...state.playerCards,
    [userId]: [...hand.slice(0, idx), ...hand.slice(idx + 1)]
  };
  const currentTrick = [...j.currentTrick, { userId, card, declaration }];
  const ns: SessionState = {
    ...state,
    playerCards,
    actionLog: [...state.actionLog, { ...action, card, declaration }],
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
  if (state.street !== 'BIDDING' && state.street !== 'TRICKS' && state.street !== 'TRUMP_CHOICE') {
    return { ok: false, reason: 'NO_ACTIVE_HAND' };
  }

  const cur = state.players[state.activePlayerIndex];
  if (cur !== action.userId) return { ok: false, reason: 'WRONG_TURN' };

  try {
    if (state.street === 'TRUMP_CHOICE') {
      if (action.type !== 'chooseTrump') return { ok: false, reason: 'INVALID_ACTION' };
      const suit = action.trumpSuit === undefined ? null : action.trumpSuit;
      return { ok: true, state: applyChooseTrump(state, action.userId, suit, action) };
    }
    if (state.street === 'BIDDING') {
      if (action.type !== 'bid') return { ok: false, reason: 'INVALID_ACTION' };
      return { ok: true, state: applyBid(state, action.userId, action.amount ?? 0, action) };
    }
    if (action.type !== 'playCard' || !action.card) {
      return { ok: false, reason: 'INVALID_ACTION' };
    }
    const card = normalizeJokerCard(action.card) ?? action.card;
    return { ok: true, state: applyPlayCard(state, action.userId, card, action) };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'INVALID_ACTION';
    return { ok: false, reason };
  }
};

export const pickBotJokerAction = (state: SessionState, userId: string): PlayerAction => {
  const at = Date.now();
  const base = { sessionId: state.sessionId, userId, at };
  const j = state.joker!;

  if (state.street === 'TRUMP_CHOICE') {
    const suits: (Suit | null)[] = ['S', 'H', 'D', 'C', null];
    const rng = botRng(state, userId);
    const trumpSuit = suits[rng.nextInt(suits.length)] ?? null;
    return { ...base, type: 'chooseTrump', trumpSuit };
  }

  if (state.street === 'BIDDING') {
    const max = maxBid(j.cardsThisDeal);
    const rng = botRng(state, userId);
    let bid = rng.nextInt(max + 1);
    const dealerId = state.players[state.dealerIndex]!;
    if (userId === dealerId) {
      bid = correctDealerBidForBot(bid, j.bids, state.players, state.dealerIndex, j.cardsThisDeal);
    }
    return { ...base, type: 'bid', amount: bid };
  }

  const hand = state.playerCards[userId] ?? [];
  const leadSuit = leadSuitFromTrick(j.currentTrick);
  const allowed = jokerLegalPlays(hand, leadSuit, j.trumpSuit, state.jokerRules?.strictJoker);
  const card =
    allowed.find((c) => !isNominalTrumpBanned(c, j.trumpSuit, j.voidTrumpDiscards)) ??
    allowed[0] ??
    hand[0]!;
  let declaration: PlayerAction['declaration'];
  if (isJokerCard(card)) {
    declaration = 'senior';
  }
  return { ...base, type: 'playCard', card, declaration };
};

export const jokerTimeoutAction = (state: SessionState, userId: string): PlayerAction => {
  if (state.street === 'TRUMP_CHOICE') {
    return {
      sessionId: state.sessionId,
      userId,
      type: 'chooseTrump',
      trumpSuit: null,
      at: Date.now()
    };
  }
  if (state.street === 'BIDDING') {
    const j = state.joker!;
    const dealerId = state.players[state.dealerIndex]!;
    let bid = 0;
    if (userId === dealerId) {
      bid = correctDealerBidForBot(0, j.bids, state.players, state.dealerIndex, j.cardsThisDeal);
    }
    return { sessionId: state.sessionId, userId, type: 'bid', amount: bid, at: Date.now() };
  }
  return pickBotJokerAction(state, userId);
};

export const isJokerMatchComplete = (state: SessionState): boolean =>
  state.mode === 'JOKER' &&
  state.street === 'COMPLETE' &&
  (state.joker?.matchHandIndex ?? 0) >= 23;
