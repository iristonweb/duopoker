import type { SessionState } from '@duopoker/shared-types/index';
import {
  activeNonFolded,
  nextActiveIndex,
  nextSeat,
  omitPlayerKey,
  totalInKettle
} from './helpers';
import { awardSingleWinner } from './showdown';
import {
  advanceStreetDeck,
  bettingComplete,
  commitRoundToPot,
  resolveShowdownHoldem,
  resetToLobbyAfterGame,
  runOutToRiver,
  shouldRunOutBoard
} from './street-machine';

const findNextActablePlayerIndex = (state: SessionState): number => {
  if (state.players.length === 0) return 0;
  const start = nextSeat(state.players.length, state.activePlayerIndex);
  return nextActiveIndex(state, start);
};

const commitPlayerRoundBetToPot = (state: SessionState, userId: string): SessionState => {
  const bet = state.playerRoundBet[userId] ?? 0;
  if (bet <= 0) return state;
  return {
    ...state,
    pot: state.pot + bet,
    playerRoundBet: { ...state.playerRoundBet, [userId]: 0 }
  };
};

export const maybeAdvanceHand = (state: SessionState): SessionState => {
  if (state.street === 'LOBBY' || state.street === 'COMPLETE' || state.street === 'SHOWDOWN') {
    return state;
  }
  const alive = activeNonFolded(state);
  if (alive.length <= 1) {
    return alive.length === 1 ? awardSingleWinner(state, alive[0]!) : state;
  }
  if (!bettingComplete(state)) {
    const idx = findNextActablePlayerIndex(state);
    const pid = state.players[idx];
    return { ...state, activePlayerIndex: idx, activePlayerId: pid };
  }
  let hold = commitRoundToPot(state);
  if (shouldRunOutBoard(hold)) {
    hold = runOutToRiver(hold);
    return resolveShowdownHoldem(hold);
  }
  if (hold.street === 'RIVER') {
    return resolveShowdownHoldem(hold);
  }
  return advanceStreetDeck(hold);
};

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
    } else {
      ns = maybeAdvanceHand(ns);
    }
  }

  if (ns.street !== 'LOBBY' && ns.street !== 'COMPLETE') {
    ns = commitPlayerRoundBetToPot(ns, userId);
  }

  const idx = ns.players.indexOf(userId);
  const players = ns.players.filter((p) => p !== userId);

  let dealerIndex = ns.dealerIndex;
  if (idx < dealerIndex) dealerIndex -= 1;
  else if (dealerIndex >= players.length) dealerIndex = Math.max(0, players.length - 1);

  let activePlayerIndex = ns.activePlayerIndex;
  if (idx < activePlayerIndex) activePlayerIndex -= 1;
  else if (idx === activePlayerIndex && players.length > 0) {
    activePlayerIndex = findNextActablePlayerIndex({
      ...ns,
      players,
      activePlayerIndex: Math.min(activePlayerIndex, players.length - 1)
    });
  }
  if (players.length && activePlayerIndex >= players.length) {
    activePlayerIndex = findNextActablePlayerIndex({ ...ns, players, activePlayerIndex: 0 });
  }

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
    actedThisRound: omitPlayerKey(ns.actedThisRound, userId)
  };

  if (players.length < 2) {
    if (
      players.length === 1 &&
      ns.street !== 'LOBBY' &&
      ns.street !== 'COMPLETE' &&
      totalInKettle(ns) > 0
    ) {
      ns = awardSingleWinner(ns, players[0]!);
    }
    ns = {
      ...resetToLobbyAfterGame(ns),
      activePlayerIndex: 0,
      activePlayerId: players[0]
    };
  }

  return { ok: true, state: ns };
};
