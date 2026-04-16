import type { Card, GameStreet, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { createDeck, shuffle } from './cards';
import { compareStrength, strengthFiveFromHand, winnerAmongPlayers } from './poker-eval';
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

const bettingComplete = (state: SessionState): boolean => {
  const active = activeNonFolded(state);
  if (active.length <= 1) return true;
  const mx = maxRoundBet(state);
  return active.every((p) => (state.playerRoundBet[p] ?? 0) === mx);
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
    activePlayerIndex: first
  };
};

const firstPostFlopActor = (state: SessionState): number => {
  const { sb } = sbBbIndices(state.players.length, state.dealerIndex);
  let idx = sb;
  for (let i = 0; i < state.players.length; i += 1) {
    const p = state.players[idx];
    if (p && !state.foldedPlayerIds.includes(p)) return idx;
    idx = nextSeat(state.players.length, idx);
  }
  return state.dealerIndex;
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

const resolveShowdownHoldem = (state: SessionState): SessionState => {
  const folded = new Set(state.foldedPlayerIds);
  const alive = state.players.filter((p) => !folded.has(p));
  const kettle = totalInKettle(state);
  if (alive.length === 1) {
    const w = alive[0]!;
    const stacks = { ...state.stacks };
    stacks[w] = (stacks[w] ?? 0) + kettle;
    return {
      ...state,
      street: 'COMPLETE',
      phase: 'SHOWDOWN',
      pot: 0,
      playerRoundBet: Object.fromEntries(state.players.map((p) => [p, 0])),
      stacks,
      winners: [w],
      winnersShare: { [w]: kettle },
      activePlayerIndex: state.dealerIndex
    };
  }
  const win = winnerAmongPlayers(state.players, state.playerCards, state.communityCards, folded);
  const stacks = { ...state.stacks };
  if (win) stacks[win] = (stacks[win] ?? 0) + kettle;
  return {
    ...state,
    street: 'COMPLETE',
    phase: 'SHOWDOWN',
    pot: 0,
    playerRoundBet: Object.fromEntries(state.players.map((p) => [p, 0])),
    stacks,
    winners: win ? [win] : [],
    winnersShare: win ? { [win]: kettle } : {},
    activePlayerIndex: state.dealerIndex
  };
};

const resolveShowdownRaspisnoy = (state: SessionState): SessionState => {
  const folded = new Set(state.foldedPlayerIds);
  let best: string | undefined;
  let bestS: ReturnType<typeof strengthFiveFromHand> | undefined;
  for (const pid of state.players) {
    if (folded.has(pid)) continue;
    const h = state.playerCards[pid];
    if (!h || h.length < 5) continue;
    const s = strengthFiveFromHand(h);
    if (!bestS || compareStrength(s, bestS) > 0) {
      best = pid;
      bestS = s;
    }
  }
  const kettle = totalInKettle(state);
  const stacks = { ...state.stacks };
  if (best) stacks[best] = (stacks[best] ?? 0) + kettle;
  return {
    ...state,
    street: 'COMPLETE',
    phase: 'SHOWDOWN',
    pot: 0,
    playerRoundBet: Object.fromEntries(state.players.map((p) => [p, 0])),
    stacks,
    winners: best ? [best] : [],
    winnersShare: best ? { [best]: kettle } : {},
    activePlayerIndex: state.dealerIndex
  };
};

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
    lastAggressor: null
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

  if (state.mode === 'HOLDEM') {
    const { sb, bb } = sbBbIndices(state.players.length, dealerIndex);
    const hole = dealHoleCards({ ...state, dealerIndex }, shuffled, 2);
    const stacks = { ...state.stacks };
    const sbAmt = Math.min(state.smallBlind, stacks[state.players[sb]!] ?? 0);
    const bbAmt = Math.min(state.bigBlind, stacks[state.players[bb]!] ?? 0);
    stacks[state.players[sb]!] = (stacks[state.players[sb]!] ?? 0) - sbAmt;
    stacks[state.players[bb]!] = (stacks[state.players[bb]!] ?? 0) - bbAmt;
    const playerRoundBet: Record<string, number> = {};
    state.players.forEach((p) => {
      playerRoundBet[p] = 0;
    });
    playerRoundBet[state.players[sb]!] = sbAmt;
    playerRoundBet[state.players[bb]!] = bbAmt;
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
      pot: 0,
      currentBet: bbAmt,
      playerRoundBet,
      lastAggressor: state.players[bb]!,
      activePlayerIndex: first,
      actionLog: [],
      winners: undefined,
      winnersShare: undefined
    };
  }

  // RASPISNOY — five cards, antes, single betting round then showdown
  const hole = dealHoleCards({ ...state, dealerIndex }, shuffled, 5);
  const stacks = { ...state.stacks };
  const ante = Math.max(1, Math.min(state.smallBlind, state.bigBlind));
  let pot = 0;
  const playerRoundBet: Record<string, number> = {};
  state.players.forEach((p) => {
    const q = Math.min(ante, stacks[p] ?? 0);
    stacks[p] = (stacks[p] ?? 0) - q;
    pot += q;
    playerRoundBet[p] = 0;
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
    activePlayerIndex: first,
    actionLog: [],
    winners: undefined,
    winnersShare: undefined
  };
};

const nextActiveIndex = (state: SessionState, from: number): number => {
  let i = from;
  for (let k = 0; k < state.players.length; k += 1) {
    const p = state.players[i];
    if (p && !state.foldedPlayerIds.includes(p)) return i;
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

  const fold = (): SessionState => ({
    ...state,
    foldedPlayerIds: [...state.foldedPlayerIds, action.userId],
    actionLog: [...state.actionLog, action]
  });

  const call = (): SessionState | null => {
    const need = toCall(state, action.userId);
    if (need === 0) return null;
    const stacks = { ...state.stacks };
    const pay = Math.min(need, stacks[action.userId] ?? 0);
    stacks[action.userId] = (stacks[action.userId] ?? 0) - pay;
    const playerRoundBet = {
      ...state.playerRoundBet,
      [action.userId]: (state.playerRoundBet[action.userId] ?? 0) + pay
    };
    const mx = Math.max(maxRoundBet({ ...state, playerRoundBet }), playerRoundBet[action.userId] ?? 0);
    return { ...state, stacks, playerRoundBet, currentBet: mx, actionLog: [...state.actionLog, action] };
  };

  const check = (): SessionState | null => {
    if (toCall(state, action.userId) !== 0) return null;
    return { ...state, actionLog: [...state.actionLog, action] };
  };

  const raiseOrBet = (raiseIncrement: number): SessionState | null => {
    const need = toCall(state, action.userId);
    const minRaise = state.bigBlind;
    const inc = Math.max(minRaise, raiseIncrement);
    const newRound = (state.playerRoundBet[action.userId] ?? 0) + need + inc;
    const stacks = { ...state.stacks };
    const pay = newRound - (state.playerRoundBet[action.userId] ?? 0);
    if (pay > (stacks[action.userId] ?? 0)) return null;
    stacks[action.userId] = (stacks[action.userId] ?? 0) - pay;
    const playerRoundBet = { ...state.playerRoundBet, [action.userId]: newRound };
    const mx = Math.max(maxRoundBet({ ...state, playerRoundBet }), newRound);
    return {
      ...state,
      stacks,
      playerRoundBet,
      currentBet: mx,
      lastAggressor: action.userId,
      actionLog: [...state.actionLog, action]
    };
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
    const won = totalInKettle(ns);
    const stacks = { ...ns.stacks };
    stacks[w] = (stacks[w] ?? 0) + won;
    return {
      ok: true,
      state: {
        ...ns,
        street: 'COMPLETE',
        phase: 'SHOWDOWN',
        pot: 0,
        currentBet: 0,
        playerRoundBet: Object.fromEntries(ns.players.map((p) => [p, 0])),
        stacks,
        winners: [w],
        winnersShare: { [w]: won },
        activePlayerId: w
      }
    };
  }

  if (!bettingComplete(ns)) {
    return { ok: true, state: rotateTurn(ns) };
  }

  if (ns.mode === 'RASPISNOY') {
    const committed = commitRoundToPot(ns);
    return { ok: true, state: resolveShowdownRaspisnoy(committed) };
  }

  const hold = commitRoundToPot(ns);
  if (hold.street === 'RIVER') {
    return { ok: true, state: resolveShowdownHoldem(hold) };
  }
  return { ok: true, state: advanceStreetDeck(hold) };
};
