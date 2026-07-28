import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';import { JOKER_RECOMMENDED_PLAYERS } from '@duopoker/shared-types/index';
import { isAutomatedPlayer } from './bot-actions';
import { createDeck, shuffle } from './cards';
import { applyJokerAction, isJokerMatchComplete, jokerTimeoutAction, startJokerHand } from './joker-table';
import { peekGhostCommunityFromDeck } from './ghost-board';
import { SeededRng, mixHandSeed } from './rng';
import {
  activeNonFolded,
  addContribution,
  canStillAct,
  emptyActed,
  firstPreflopActor,
  markActed,
  markAllIn,
  maxRoundBet,
  resetActedExcept,
  rotateTurn,
  sbBbIndices,
  toCall,
  totalInKettle,
  withHandComplete
} from './holdem/helpers';
import { removePlayerFromTable } from './holdem/player-lifecycle';
import { applyUncalledReturn } from './holdem/showdown';
import {
  advanceStreetDeck,
  bettingComplete,
  commitRoundToPot,
  resetToLobbyAfterGame,
  resolveShowdownHoldem,
  runOutToRiver,
  shouldRunOutBoard
} from './holdem/street-machine';

export { totalInKettle, sbBbIndices, resetToLobbyAfterGame, removePlayerFromTable };
export const createInitialTableState = (
  sessionId: string,
  mode: SessionState['mode'],
  buyIn: number,
  seed: number,
  jokerRules?: SessionState['jokerRules']
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
    lastRaiseSize: bb,
    allInPlayerIds: [],
    actedThisRound: {},
    handContributions: {},
    readyForNextHand: [],
    jokerRules: mode === 'JOKER' ? jokerRules : undefined
  };
};

export const addPlayerToTable = (state: SessionState, userId: string): SessionState => {
  if (state.players.includes(userId)) return state;
  const maxSeats = state.mode === 'JOKER' ? JOKER_RECOMMENDED_PLAYERS : 6;
  if (state.players.length >= maxSeats) return state;
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
  const n = state.players.length;
  if (n === 0) return { playerCards, deck: d };
  const start = (state.dealerIndex + 1) % n;
  for (let c = 0; c < count; c += 1) {
    for (let i = 0; i < n; i += 1) {
      const pid = state.players[(start + i) % n]!;
      if (d.length) {
        playerCards[pid] = [...(playerCards[pid] ?? []), d[0]!];
        d = d.slice(1);
      }
    }
  }
  return { playerCards, deck: d };
};

export const startNewHand = (state: SessionState): SessionState => {
  if (state.players.length < 2) return state;
  const rng = new SeededRng(mixHandSeed(state.seed, state.handNumber));
  const dealerIndex = state.handNumber === 0 ? 0 : (state.dealerIndex + 1) % state.players.length;
  const actedThisRound = emptyActed(state.players);
  const handContributions: Record<string, number> = Object.fromEntries(
    state.players.map((p) => [p, 0])
  );

  if (state.mode === 'HOLDEM') {
    const shuffled = shuffle(createDeck(), rng);
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
      lastRaiseSize: state.bigBlind,
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

  if (state.mode === 'JOKER') {
    return startJokerHand({ ...state, dealerIndex }, dealerIndex, rng);
  }

  return state;
};

export const applyTableAction = (
  state: SessionState,
  action: PlayerAction
): { ok: true; state: SessionState } | { ok: false; reason: string } => {
  if (state.mode === 'JOKER') {
    return applyJokerAction(state, action);
  }

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
    const logged: PlayerAction = {
      ...action,
      amount: pay,
      allIn: stacks[action.userId] === 0
    };
    let ns: SessionState = {
      ...state,
      stacks,
      playerRoundBet,
      currentBet: mx,
      actionLog: [...state.actionLog, logged]
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
    const minRaise = state.lastRaiseSize ?? state.bigBlind;
    const inc = Math.max(minRaise, raiseIncrement);
    const desiredRound = (state.playerRoundBet[action.userId] ?? 0) + need + inc;
    const maxAffordable = (state.playerRoundBet[action.userId] ?? 0) + stack;
    const newRound = Math.min(desiredRound, maxAffordable);
    const prevMax = maxRoundBet(state);
    const pay = newRound - (state.playerRoundBet[action.userId] ?? 0);
    if (pay <= 0) return null;
    if (newRound <= prevMax && newRound < maxAffordable) return null;

    const raiseSize = newRound - prevMax;
    const isAllIn = newRound === maxAffordable && stack > 0;
    const isFullRaise = raiseSize >= minRaise;

    const stacks = { ...state.stacks };
    stacks[action.userId] = (stacks[action.userId] ?? 0) - pay;
    const playerRoundBet = { ...state.playerRoundBet, [action.userId]: newRound };
    const mx = Math.max(prevMax, newRound);
    const logged: PlayerAction = {
      ...action,
      amount: pay,
      raiseBy: action.type === 'raise' ? raiseSize : undefined,
      allIn: isAllIn && stacks[action.userId] === 0
    };
    let ns: SessionState = {
      ...state,
      stacks,
      playerRoundBet,
      currentBet: mx,
      lastAggressor: action.userId,
      actionLog: [...state.actionLog, logged]
    };
    ns = addContribution(ns, action.userId, pay);
    ns = markAllIn(ns, action.userId);
    if (newRound > prevMax && isFullRaise) {
      ns = {
        ...resetActedExcept(ns, action.userId),
        lastRaiseSize: raiseSize
      };
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
  if (isJokerMatchComplete(state)) {
    return { ok: true, started: false, state: { ...state, readyForNextHand: readyWithBots } };
  }
  return { ok: true, started: true, state: startNewHand({ ...state, readyForNextHand: [] }) };
};

/** Auto-act on timeout (fold in Hold'em; pass/play in Joker). */
export const autoFoldActivePlayer = (
  state: SessionState,
  userId: string
): { ok: true; state: SessionState } | { ok: false; reason: string } => {
  const cur = state.players[state.activePlayerIndex];
  if (cur !== userId) return { ok: false, reason: 'WRONG_TURN' };
  if (state.mode === 'JOKER') {
    return applyTableAction(state, jokerTimeoutAction(state, userId));
  }
  return applyTableAction(state, {
    sessionId: state.sessionId,
    userId,
    type: 'fold',
    at: Date.now()
  });
};
