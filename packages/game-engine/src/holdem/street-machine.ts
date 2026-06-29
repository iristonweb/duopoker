import type { Card, GameStreet, SessionState } from '@duopoker/shared-types/index';
import { computeSidePots, distributeSidePots } from '../pot-calculator';
import {
  activeNonFolded,
  canStillAct,
  emptyActed,
  maxRoundBet,
  nextActiveIndex,
  nextSeat,
  sbBbIndices,
  totalInKettle,
  withHandComplete
} from './helpers';
import { applyUncalledReturn } from './showdown';

export const bettingComplete = (state: SessionState): boolean => {
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

export const shouldRunOutBoard = (state: SessionState): boolean => {
  const active = activeNonFolded(state);
  if (active.length <= 1) return false;
  const withChips = active.filter((p) => (state.stacks[p] ?? 0) > 0);
  return withChips.length <= 1;
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

export const advanceStreetDeck = (state: SessionState): SessionState => {
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
    lastRaiseSize: state.bigBlind,
    actedThisRound: emptyActed(state.players),
    activePlayerIndex: first
  };
};

export const runOutToRiver = (state: SessionState): SessionState => {
  let s = state;
  while (s.street === 'PREFLOP' || s.street === 'FLOP' || s.street === 'TURN') {
    s = advanceStreetDeck(s);
  }
  return s;
};

export const commitRoundToPot = (state: SessionState): SessionState => {
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

const finalizeShowdown = (state: SessionState): SessionState => {
  const folded = new Set(state.foldedPlayerIds);
  const committed = commitRoundToPot(state);
  const pots = computeSidePots(committed.players, committed.handContributions, folded);
  const { winners, winnersShare } = distributeSidePots(
    pots,
    committed.playerCards,
    committed.communityCards,
    committed.mode,
    committed.players,
    committed.dealerIndex
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

export const resolveShowdownHoldem = (state: SessionState): SessionState => {
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

export const resetToLobbyAfterGame = (state: SessionState): SessionState => ({
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
  actionLog: [],
  handContributions: Object.fromEntries(state.players.map((p) => [p, 0])),
  allInPlayerIds: [],
  playerCards: Object.fromEntries(state.players.map((p) => [p, []])),
  deck: [],
  actedThisRound: Object.fromEntries(state.players.map((p) => [p, false])),
  lastAggressor: null,
  ghostCommunityCards: undefined
});
