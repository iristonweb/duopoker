import type { Card, GameStreet, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { isAutomatedPlayer } from './bot-actions';
import { createDeck, shuffle } from './cards';
import { peekGhostCommunityFromDeck } from './ghost-board';
import {
  computeSidePots,
  distributeSidePots,
  uncalledRoundBet
} from './pot-calculator';
import { SeededRng } from './rng';

/** Committed from prior streets + current street bets (full kettle). */
export const totalInKettle = (state: SessionState): number =>
  state.pot +
  state.players.reduce((sum, p) => sum + (state.playerRoundBet[p] ?? 0), 0);

export const sbBbIndices = (
  numPlayers: number,
  dealerIndex: number
): { sb: number; bb: number } => {
  if (numPlayers < 2) throw new Error('need 2+ players');
  if (numPlayers === 2) {
    return { sb: dealerIndex, bb: (dealerIndex + 1) % 2 };
  }
  return {
    sb: (dealerIndex + 1) % numPlayers,
    bb: (dealerIndex + 2) % numPlayers
  };
};

const firstPreflopActor = (numPlayers: number, dealerIndex: number): number => {
  if (numPlayers === 2) return dealerIndex;
  const { bb } = sbBbIndices(numPlayers, dealerIndex);
  return (bb + 1) % numPlayers;
};

const nextSeat = (numPlayers: number, from: number): number => (from + 1) % numPlayers;

const activeNonFolded = (state: SessionState): string[] =>
  state.players.filter((p) => !state.foldedPlayerIds.includes(p));

const maxRoundBet = (state: SessionState): number =>
  state.players.reduce((m, p) => Math.max(m, state.playerRoundBet[p] ?? 0), 0);

const toCall = (state: SessionState, userId: string): number =>
  Math.max(0, maxRoundBet(state) - (state.playerRoundBet[userId] ?? 0));

const emptyActed = (players: string[]): Record<string, boolean> =>
  Object.fromEntries(players.map((p) => [p, false]));

const canStillAct = (state: SessionState, pid: string): boolean =>
  !state.foldedPlayerIds.includes(pid) && (state.stacks[pid] ?? 0) > 0;

const markAllIn = (state: SessionState, userId: string): SessionState => {
  if ((state.stacks[userId] ?? 0) > 0) return state;
  if (state.allInPlayerIds.includes(userId)) return state;
  return { ...state, allInPlayerIds: [...state.allInPlayerIds, userId] };
};

const addContribution = (state: SessionState, userId: string, amount: number): SessionState => ({
  ...state,
  handContributions: {
    ...state.handContributions,
    [userId]: (state.handContributions[userId] ?? 0) + amount
  }
});

const resetActedExcept = (state: SessionState, except: string): SessionState => ({
  ...state,
  actedThisRound: Object.fromEntries(state.players.map((p) => [p, p === except]))
});

const markActed = (state: SessionState, userId: string): SessionState => ({
  ...state,
  actedThisRound: { ...state.actedThisRound, [userId]: true }
});

const bettingComplete = (state: SessionState): boolean => {
  const active = activeNonFolded(state);
  if (active.length <= 1) return true;
  const mx = maxRoundBet(state);

  for (const p of active) {
    const bet = state.playerRoundBet[p] ?? 0;
    if (bet < mx && (state.stacks[p] ?? 0) > 0) return false;
  }

  for (const p of active) {
    if (!canStillAct(state, p)) continue;
    if (!state.actedThisRound[p]) return false;
  }
  return true;
};

const shouldRunOutBoard = (state: SessionState): boolean => {
  const active = activeNonFolded(state);
  if (active.length <= 1) return false;
  const withChips = active.filter((p) => (state.stacks[p] ?? 0) > 0);
  return withChips.length <= 1;
};

const advanceStreetDeck = (state: SessionState): SessionState => {
  let deck = [...state.deck];
  const burn = () => {
    if (deck.length) deck = deck.slice(1);
  };
  const take = (n: number): Card[] => {
    const out: Card[] = [];
    for (let i = 0; i < n && deck.length; i += 1) {
      out.push(deck[0]!);
      deck = deck.slice(1);
    }
    return out;
  };

  let community = [...state.communityCards];
  let street: GameStreet = state.street;

  if (street === 'PREFLOP') {
    burn();
    community = [...community, ...take(3)];
    street = 'FLOP';
  } else if (street === 'FLOP') {
    burn();
    community = [...community, ...take(1)];
    street = 'TURN';
  } else if (street === 'TURN') {
    burn();
    community = [...community, ...take(1)];
    street = 'RIVER';
  } else {
    return state;
  }

  const resetBets: Record<string, number> = {};
  state.players.forEach((p) => {
    resetBets[p] = 0;
  });

  const first = firstPostFlopActor(state);
  return {
    ...state,
    deck,
    communityCards: community,
    street,
    phase: mapStreetToPhase(street),
    currentBet: 0,
    playerRoundBet: resetBets,
    lastAggressor: null,
    actedThisRound: emptyActed(state.players),
    activePlayerIndex: first
  };
};

const runOutToRiver = (state: SessionState): SessionState => {
  let s = state;
  while (s.street === 'PREFLOP' || s.street === 'FLOP' || s.street === 'TURN') {
    s = advanceStreetDeck(s);
  }
  return s;
};

const firstPostFlopActor = (state: SessionState): number => {
  const { sb } = sbBbIndices(state.players.length, state.dealerIndex);
  let idx = sb;
  for (let i = 0; i < state.players.length; i += 1) {
    const p = state.players[idx];
    if (p && !state.foldedPlayerIds.includes(p) && canStillAct(state, p)) return idx;
    idx = nextSeat(state.players.length, idx);
  }
  return nextActiveIndex(state, state.dealerIndex);
};

const mapStreetToPhase = (s: GameStreet): SessionState['phase'] => {
  switch (s) {
    case 'LOBBY':
      return 'DEAL';
    case 'PREFLOP':
      return 'PRE_FLOP';
    case 'FLOP':
      return 'FLOP';
    case 'TURN':
      return 'TURN';
    case 'RIVER':
      return 'RIVER';
    case 'SHOWDOWN':
      return 'SHOWDOWN';
    case 'COMPLETE':
      return 'SHOWDOWN';
    default:
      return 'DEAL';
  }
};

const commitRoundToPot = (state: SessionState): SessionState => {
  let add = 0;
  const reset: Record<string, number> = {};
  state.players.forEach((p) => {
    const v = state.playerRoundBet[p] ?? 0;
    add += v;
    reset[p] = 0;
  });
  return {
    ...state,
    pot: state.pot + add,
    playerRoundBet: reset,
    currentBet: 0
  };
};

const applyUncalledReturn = (state: SessionState): SessionState => {
  const uncalled = uncalledRoundBet(state);
  if (!uncalled) return state;
  const stacks = { ...state.stacks };
  stacks[uncalled.playerId] = (stacks[uncalled.playerId] ?? 0) + uncalled.amount;
  const playerRoundBet = {
    ...state.playerRoundBet,
    [uncalled.playerId]: (state.playerRoundBet[uncalled.playerId] ?? 0) - uncalled.amount
  };
  const handContributions = {
    ...state.handContributions,
    [uncalled.playerId]: Math.max(
      0,
      (state.handContributions[uncalled.playerId] ?? 0) - uncalled.amount
    )
  };
  return { ...state, stacks, playerRoundBet, handContributions };
};

const withHandComplete = (state: SessionState): SessionState => ({
  ...state,
  handCompletedAt: state.handCompletedAt ?? Date.now()
});

const resetToLobbyAfterGame = (state: SessionState): SessionState => ({
  ...state,
  street: 'LOBBY',
  phase: 'DEAL',
  pot: 0,
  currentBet: 0,
  communityCards: [],
  playerRoundBet: Object.fromEntries(state.players.map((p) => [p, 0])),
  foldedPlayerIds: [],
  readyForNextHand: [],
  winners: undefined,
  winnersShare: undefined,
  handCompletedAt: undefined,
  actionDeadlineAt: undefined,
  actionLog: []
});

const finalizeShowdown = (state: SessionState): SessionState => {
  const folded = new Set(state.foldedPlayerIds);
  const committed = commitRoundToPot(state);
  const pots = computeSidePots(committed.players, committed.handContributions, folded);
  const { winners, winnersShare } = distributeSidePots(
    pots,
    committed.playerCards,
    committed.communityCards,
    committed.mode
  );
  const stacks = { ...committed.stacks };
  for (const [pid, share] of Object.entries(winnersShare)) {
    stacks[pid] = (stacks[pid] ?? 0) + share;
  }
  return withHandComplete({
    ...committed,
    street: 'COMPLETE',
    phase: 'SHOWDOWN',
    pot: 0,
    playerRoundBet: Object.fromEntries(committed.players.map((p) => [p, 0])),
    stacks,
    winners,
    winnersShare,
    readyForNextHand: [],
    activePlayerIndex: committed.dealerIndex
  });
};

const resolveShowdownHoldem = (state: SessionState): SessionState => {
  const folded = new Set(state.foldedPlayerIds);
  const alive = state.players.filter((p) => !folded.has(p));
  if (alive.length === 1) {
    const w = alive[0]!;
    const ns = applyUncalledReturn(state);
    const won = totalInKettle(ns);
    const stacks = { ...ns.stacks };
    stacks[w] = (stacks[w] ?? 0) + won;
    return withHandComplete({
      ...ns,
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      pot: 0,
      playerRoundBet: Object.fromEntries(ns.players.map((p) => [p, 0])),
      stacks,
      winners: [w],
      winnersShare: { [w]: won },
      readyForNextHand: [],
      activePlayerIndex: ns.dealerIndex
    });
  }
  return finalizeShowdown(state);
};

const resolveShowdownRaspisnoy = (state: SessionState): SessionState => {
  const folded = new Set(state.foldedPlayerIds);
  const alive = state.players.filter((p) => !folded.has(p));
  if (alive.length === 1) {
    const w = alive[0]!;
    const ns = applyUncalledReturn(state);
    const won = totalInKettle(ns);
    const stacks = { ...ns.stacks };
    stacks[w] = (stacks[w] ?? 0) + won;
    return withHandComplete({
      ...ns,
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      pot: 0,
      playerRoundBet: Object.fromEntries(ns.players.map((p) => [p, 0])),
      stacks,
      winners: [w],
      winnersShare: { [w]: won },
      readyForNextHand: [],
      activePlayerIndex: ns.dealerIndex
    });
  }
  return finalizeShowdown(state);
};

export { resetToLobbyAfterGame };

export const createInitialTableState = (
  sessionId: string,
  mode: SessionState['mode'],
  buyIn: number,
  seed: number
): SessionState => {
  const bb = Math.max(2, Math.floor(buyIn / 50) * 2);
  const sb = Math.max(1, Math.floor(bb / 2));
  return {
    sessionId,
    mode,
    phase: 'DEAL',
    street: 'LOBBY',
    pot: 0,
    buyIn,
    smallBlind: sb,
    bigBlind: bb,
    seed,
    handNumber: 0,
    players: [],
    dealerIndex: 0,
    activePlayerIndex: 0,
    communityCards: [],
    playerCards: {},
    stacks: {},
    foldedPlayerIds: [],
    currentBet: 0,
    playerRoundBet: {},
    actionLog: [],
    deck: [],
    lastAggressor: null,
    allInPlayerIds: [],
    actedThisRound: {},
    handContributions: {},
    readyForNextHand: []
  };
};

export const addPlayerToTable = (state: SessionState, userId: string): SessionState => {
  if (state.players.includes(userId)) return state;
  if (state.players.length >= 6) return state;
  const next = [...state.players, userId];
  const stacks = { ...state.stacks, [userId]: state.buyIn };
  return { ...state, players: next, stacks };
};

const dealHoleCards = (
  state: SessionState,
  deck: Card[],
  count: number
): { playerCards: Record<string, Card[]>; deck: Card[] } => {
  let d = deck;
  const playerCards: Record<string, Card[]> = {};
  state.players.forEach((pid) => {
    playerCards[pid] = [];
  });
  for (let c = 0; c < count; c += 1) {
    state.players.forEach((pid) => {
      if (d.length) {
        playerCards[pid] = [...(playerCards[pid] ?? []), d[0]!];
        d = d.slice(1);
      }
    });
  }
  return { playerCards, deck: d };
};

export const startNewHand = (state: SessionState): SessionState => {
  if (state.players.length < 2) return state;
  const rng = new SeededRng(state.seed + state.handNumber + 1);
  const shuffled = shuffle(createDeck(), rng);
  const dealerIndex = state.handNumber === 0 ? 0 : (state.dealerIndex + 1) % state.players.length;
  const actedThisRound = emptyActed(state.players);
  const handContributions: Record<string, number> = Object.fromEntries(
    state.players.map((p) => [p, 0])
  );

  if (state.mode === 'HOLDEM') {
    const { sb, bb } = sbBbIndices(state.players.length, dealerIndex);
    const hole = dealHoleCards({ ...state, dealerIndex }, shuffled, 2);
    const stacks = { ...state.stacks };
    const sbAmt = Math.min(state.smallBlind, stacks[state.players[sb]!] ?? 0);
    const bbAmt = Math.min(state.bigBlind, stacks[state.players[bb]!] ?? 0);
    stacks[state.players[sb]!] = (stacks[state.players[sb]!] ?? 0) - sbAmt;
    stacks[state.players[bb]!] = (stacks[state.players[bb]!] ?? 0) - bbAmt;
    handContributions[state.players[sb]!] = sbAmt;
    handContributions[state.players[bb]!] = bbAmt;
    const playerRoundBet: Record<string, number> = {};
    state.players.forEach((p) => {
      playerRoundBet[p] = 0;
    });
    playerRoundBet[state.players[sb]!] = sbAmt;
    playerRoundBet[state.players[bb]!] = bbAmt;
    const first = firstPreflopActor(state.players.length, dealerIndex);
    const allInPlayerIds: string[] = [];
    if ((stacks[state.players[sb]!] ?? 0) === 0) allInPlayerIds.push(state.players[sb]!);
    if ((stacks[state.players[bb]!] ?? 0) === 0) allInPlayerIds.push(state.players[bb]!);
    return {
      ...state,
      dealerIndex,
      handNumber: state.handNumber + 1,
      street: 'PREFLOP',
      phase: 'PRE_FLOP',
      communityCards: [],
      foldedPlayerIds: [],
      playerCards: hole.playerCards,
      deck: hole.deck,
      stacks,
      pot: 0,
      currentBet: bbAmt,
      playerRoundBet,
      lastAggressor: state.players[bb]!,
      allInPlayerIds,
      actedThisRound,
      handContributions,
      readyForNextHand: [],
      activePlayerIndex: first,
      actionLog: [],
      winners: undefined,
      winnersShare: undefined,
      ghostCommunityCards: undefined
    };
  }

  const hole = dealHoleCards({ ...state, dealerIndex }, shuffled, 5);
  const stacks = { ...state.stacks };
  const ante = Math.max(1, Math.min(state.smallBlind, state.bigBlind));
  let pot = 0;
  const playerRoundBet: Record<string, number> = {};
  const allInPlayerIds: string[] = [];
  state.players.forEach((p) => {
    const q = Math.min(ante, stacks[p] ?? 0);
    stacks[p] = (stacks[p] ?? 0) - q;
    pot += q;
    handContributions[p] = q;
    playerRoundBet[p] = 0;
    if ((stacks[p] ?? 0) === 0 && q > 0) allInPlayerIds.push(p);
  });
  const first = firstPreflopActor(state.players.length, dealerIndex);
  return {
    ...state,
    dealerIndex,
    handNumber: state.handNumber + 1,
    street: 'PREFLOP',
    phase: 'PRE_FLOP',
    communityCards: [],
    foldedPlayerIds: [],
    playerCards: hole.playerCards,
    deck: hole.deck,
    stacks,
    pot,
    currentBet: 0,
    playerRoundBet,
    lastAggressor: null,
    allInPlayerIds,
    actedThisRound,
    handContributions,
    readyForNextHand: [],
    activePlayerIndex: first,
    actionLog: [],
    winners: undefined,
    winnersShare: undefined,
    ghostCommunityCards: undefined
  };
};

const nextActiveIndex = (state: SessionState, from: number): number => {
  let i = from;
  for (let k = 0; k < state.players.length; k += 1) {
    const p = state.players[i];
    if (p && !state.foldedPlayerIds.includes(p) && canStillAct(state, p)) return i;
    i = nextSeat(state.players.length, i);
  }
  return from;
};

const rotateTurn = (state: SessionState): SessionState => {
  const start = nextSeat(state.players.length, state.activePlayerIndex);
  const idx = nextActiveIndex(state, start);
  const pid = state.players[idx];
  return { ...state, activePlayerIndex: idx, activePlayerId: pid };
};

export const applyTableAction = (
  state: SessionState,
  action: PlayerAction
): { ok: true; state: SessionState } | { ok: false; reason: string } => {
  if (state.street === 'LOBBY' || state.street === 'COMPLETE') {
    return { ok: false, reason: 'NO_ACTIVE_HAND' };
  }
  if (state.street === 'SHOWDOWN') {
    return { ok: false, reason: 'HAND_OVER' };
  }

  const cur = state.players[state.activePlayerIndex];
  if (cur !== action.userId) {
    return { ok: false, reason: 'WRONG_TURN' };
  }

  if (!canStillAct(state, action.userId) && action.type !== 'fold') {
    return { ok: false, reason: 'ALL_IN' };
  }

  const fold = (): SessionState => ({
    ...markActed(state, action.userId),
    foldedPlayerIds: [...state.foldedPlayerIds, action.userId],
    actionLog: [...state.actionLog, action]
  });

  const call = (): SessionState | null => {
    const need = toCall(state, action.userId);
    if (need === 0) return null;
    const stack = state.stacks[action.userId] ?? 0;
    if (stack === 0) return null;
    const stacks = { ...state.stacks };
    const pay = Math.min(need, stack);
    stacks[action.userId] = stack - pay;
    const playerRoundBet = {
      ...state.playerRoundBet,
      [action.userId]: (state.playerRoundBet[action.userId] ?? 0) + pay
    };
    const mx = Math.max(maxRoundBet({ ...state, playerRoundBet }), playerRoundBet[action.userId] ?? 0);
    let ns: SessionState = {
      ...state,
      stacks,
      playerRoundBet,
      currentBet: mx,
      actionLog: [...state.actionLog, action]
    };
    ns = addContribution(ns, action.userId, pay);
    ns = markActed(ns, action.userId);
    ns = markAllIn(ns, action.userId);
    return ns;
  };

  const check = (): SessionState | null => {
    if (toCall(state, action.userId) !== 0) return null;
    return markActed({ ...state, actionLog: [...state.actionLog, action] }, action.userId);
  };

  const raiseOrBet = (raiseIncrement: number): SessionState | null => {
    const stack = state.stacks[action.userId] ?? 0;
    if (stack === 0) return null;
    const need = toCall(state, action.userId);
    const minRaise = state.bigBlind;
    const inc = Math.max(minRaise, raiseIncrement);
    const desiredRound = (state.playerRoundBet[action.userId] ?? 0) + need + inc;
    const maxAffordable = (state.playerRoundBet[action.userId] ?? 0) + stack;
    const newRound = Math.min(desiredRound, maxAffordable);
    const prevMax = maxRoundBet(state);
    const pay = newRound - (state.playerRoundBet[action.userId] ?? 0);
    if (pay <= 0) return null;
    if (newRound <= prevMax && newRound < maxAffordable) return null;

    const stacks = { ...state.stacks };
    stacks[action.userId] = (stacks[action.userId] ?? 0) - pay;
    const playerRoundBet = { ...state.playerRoundBet, [action.userId]: newRound };
    const mx = Math.max(prevMax, newRound);
    let ns: SessionState = {
      ...state,
      stacks,
      playerRoundBet,
      currentBet: mx,
      lastAggressor: action.userId,
      actionLog: [...state.actionLog, action]
    };
    ns = addContribution(ns, action.userId, pay);
    ns = markAllIn(ns, action.userId);
    if (newRound > prevMax) {
      ns = resetActedExcept(ns, action.userId);
    } else {
      ns = markActed(ns, action.userId);
    }
    return ns;
  };

  let ns: SessionState;
  switch (action.type) {
    case 'fold':
      ns = fold();
      break;
    case 'check': {
      const c = check();
      if (!c) return { ok: false, reason: 'ILLEGAL_CHECK' };
      ns = c;
      break;
    }
    case 'call': {
      const c = call();
      if (!c) return { ok: false, reason: 'ILLEGAL_CALL' };
      ns = c;
      break;
    }
    case 'bet':
    case 'raise': {
      const r = raiseOrBet(action.amount ?? state.bigBlind);
      if (!r) return { ok: false, reason: 'ILLEGAL_RAISE' };
      ns = r;
      break;
    }
    default:
      return { ok: false, reason: 'UNKNOWN_ACTION' };
  }

  const alive = activeNonFolded(ns);
  if (alive.length === 1) {
    const w = alive[0]!;
    const awarded = applyUncalledReturn(ns);
    const won = totalInKettle(awarded);
    const stacks = { ...awarded.stacks };
    stacks[w] = (stacks[w] ?? 0) + won;
    const ghostCommunityCards =
      ns.mode === 'HOLDEM' && ns.communityCards.length === 0
        ? peekGhostCommunityFromDeck(awarded.deck)
        : undefined;
    return {
      ok: true,
      state: withHandComplete({
        ...awarded,
        street: 'COMPLETE',
        phase: 'SHOWDOWN',
        pot: 0,
        currentBet: 0,
        playerRoundBet: Object.fromEntries(ns.players.map((p) => [p, 0])),
        stacks,
        winners: [w],
        winnersShare: { [w]: won },
        readyForNextHand: [],
        activePlayerIndex: ns.players.indexOf(w),
        activePlayerId: w,
        ghostCommunityCards
      })
    };
  }

  if (!bettingComplete(ns)) {
    return { ok: true, state: rotateTurn(ns) };
  }

  if (ns.mode === 'RASPISNOY') {
    const committed = commitRoundToPot(ns);
    return { ok: true, state: resolveShowdownRaspisnoy(committed) };
  }

  let hold = commitRoundToPot(ns);
  if (shouldRunOutBoard(hold)) {
    hold = runOutToRiver(hold);
    return { ok: true, state: resolveShowdownHoldem(hold) };
  }
  if (hold.street === 'RIVER') {
    return { ok: true, state: resolveShowdownHoldem(hold) };
  }
  return { ok: true, state: advanceStreetDeck(hold) };
};

/** Mark a player ready; starts next hand when all seated players are ready. */
export const markReadyForNextHand = (
  state: SessionState,
  userId: string
): { ok: true; state: SessionState; started: boolean } | { ok: false; reason: string } => {
  if (state.street !== 'COMPLETE') {
    return { ok: false, reason: 'CANNOT_START' };
  }
  if (!state.players.includes(userId)) {
    return { ok: false, reason: 'NOT_SEATED' };
  }
  const ready = state.readyForNextHand.includes(userId)
    ? state.readyForNextHand
    : [...state.readyForNextHand, userId];
  const readyWithBots = [
    ...new Set([...ready, ...state.players.filter(isAutomatedPlayer)])
  ];
  const humans = state.players.filter((p) => !isAutomatedPlayer(p));
  const allHumansReady = humans.every((p) => readyWithBots.includes(p));
  if (!allHumansReady) {
    return { ok: true, started: false, state: { ...state, readyForNextHand: readyWithBots } };
  }
  return { ok: true, started: true, state: startNewHand({ ...state, readyForNextHand: [] }) };
};

/** Auto-fold the active player (disconnect / action timeout). */
export const autoFoldActivePlayer = (
  state: SessionState,
  userId: string
): { ok: true; state: SessionState } | { ok: false; reason: string } => {
  const cur = state.players[state.activePlayerIndex];
  if (cur !== userId) return { ok: false, reason: 'WRONG_TURN' };
  return applyTableAction(state, {
    sessionId: state.sessionId,
    userId,
    type: 'fold',
    at: Date.now()
  });
};

const awardSingleWinner = (state: SessionState, winnerId: string): SessionState => {
  const awarded = applyUncalledReturn(state);
  const won = totalInKettle(awarded);
  const stacks = { ...awarded.stacks };
  stacks[winnerId] = (stacks[winnerId] ?? 0) + won;
  return withHandComplete({
    ...awarded,
    street: 'COMPLETE',
    phase: 'SHOWDOWN',
    pot: 0,
    currentBet: 0,
    playerRoundBet: Object.fromEntries(awarded.players.map((p) => [p, 0])),
    stacks,
    winners: [winnerId],
    winnersShare: { [winnerId]: won },
    readyForNextHand: [],
    activePlayerIndex: awarded.players.indexOf(winnerId),
    activePlayerId: winnerId
  });
};

const omitPlayerKey = <T>(rec: Record<string, T>, userId: string): Record<string, T> => {
  const next = { ...rec };
  delete next[userId];
  return next;
};

/** Remove a seated player (leave table). Folds active hand if needed. */
export const removePlayerFromTable = (
  state: SessionState,
  userId: string
): { ok: true; state: SessionState } | { ok: false; reason: string } => {
  if (!state.players.includes(userId)) {
    return { ok: false, reason: 'NOT_SEATED' };
  }

  let ns = state;

  if (ns.street !== 'LOBBY' && ns.street !== 'COMPLETE' && !ns.foldedPlayerIds.includes(userId)) {
    ns = { ...ns, foldedPlayerIds: [...ns.foldedPlayerIds, userId] };
    const alive = activeNonFolded(ns);
    if (alive.length === 1) {
      ns = awardSingleWinner(ns, alive[0]!);
    } else if (ns.players[ns.activePlayerIndex] === userId) {
      ns = rotateTurn(ns);
    }
  }

  const idx = ns.players.indexOf(userId);
  const players = ns.players.filter((p) => p !== userId);

  let dealerIndex = ns.dealerIndex;
  if (idx < dealerIndex) dealerIndex -= 1;
  else if (dealerIndex >= players.length) dealerIndex = Math.max(0, players.length - 1);

  let activePlayerIndex = ns.activePlayerIndex;
  if (idx < activePlayerIndex) activePlayerIndex -= 1;
  else if (idx === activePlayerIndex) activePlayerIndex = 0;
  if (players.length && activePlayerIndex >= players.length) activePlayerIndex = 0;

  ns = {
    ...ns,
    players,
    dealerIndex,
    activePlayerIndex,
    activePlayerId: players[activePlayerIndex],
    foldedPlayerIds: ns.foldedPlayerIds.filter((id) => id !== userId),
    readyForNextHand: ns.readyForNextHand.filter((id) => id !== userId),
    allInPlayerIds: ns.allInPlayerIds.filter((id) => id !== userId),
    stacks: omitPlayerKey(ns.stacks, userId),
    playerRoundBet: omitPlayerKey(ns.playerRoundBet, userId),
    playerCards: omitPlayerKey(ns.playerCards, userId),
    handContributions: omitPlayerKey(ns.handContributions, userId),
    actedThisRound: omitPlayerKey(ns.actedThisRound, userId)
  };

  if (players.length < 2) {
    ns = {
      ...ns,
      street: 'LOBBY',
      phase: 'DEAL',
      pot: 0,
      currentBet: 0,
      communityCards: [],
      playerRoundBet: Object.fromEntries(players.map((p) => [p, 0])),
      foldedPlayerIds: [],
      readyForNextHand: [],
      winners: undefined,
      winnersShare: undefined,
      handCompletedAt: undefined,
      actionDeadlineAt: undefined,
      actionLog: [],
      activePlayerIndex: 0,
      activePlayerId: players[0]
    };
  }

  return { ok: true, state: ns };
};
