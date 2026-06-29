import type { SessionState } from '@duopoker/shared-types/index';

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

export const firstPreflopActor = (numPlayers: number, dealerIndex: number): number => {
  if (numPlayers === 2) return dealerIndex;
  const { bb } = sbBbIndices(numPlayers, dealerIndex);
  return (bb + 1) % numPlayers;
};

export const nextSeat = (numPlayers: number, from: number): number => (from + 1) % numPlayers;

export const activeNonFolded = (state: SessionState): string[] =>
  state.players.filter((p) => !state.foldedPlayerIds.includes(p));

export const maxRoundBet = (state: SessionState): number =>
  state.players.reduce((m, p) => Math.max(m, state.playerRoundBet[p] ?? 0), 0);

export const toCall = (state: SessionState, userId: string): number =>
  Math.max(0, maxRoundBet(state) - (state.playerRoundBet[userId] ?? 0));

export const emptyActed = (players: string[]): Record<string, boolean> =>
  Object.fromEntries(players.map((p) => [p, false]));

export const canStillAct = (state: SessionState, pid: string): boolean =>
  !state.foldedPlayerIds.includes(pid) && (state.stacks[pid] ?? 0) > 0;

export const markAllIn = (state: SessionState, userId: string): SessionState => {
  if ((state.stacks[userId] ?? 0) > 0) return state;
  if (state.allInPlayerIds.includes(userId)) return state;
  return { ...state, allInPlayerIds: [...state.allInPlayerIds, userId] };
};

export const addContribution = (state: SessionState, userId: string, amount: number): SessionState => ({
  ...state,
  handContributions: {
    ...state.handContributions,
    [userId]: (state.handContributions[userId] ?? 0) + amount
  }
});

export const resetActedExcept = (state: SessionState, except: string): SessionState => ({
  ...state,
  actedThisRound: Object.fromEntries(state.players.map((p) => [p, p === except]))
});

export const markActed = (state: SessionState, userId: string): SessionState => ({
  ...state,
  actedThisRound: { ...state.actedThisRound, [userId]: true }
});

export const nextActiveIndex = (state: SessionState, from: number): number => {
  let i = from;
  for (let k = 0; k < state.players.length; k += 1) {
    const p = state.players[i];
    if (p && !state.foldedPlayerIds.includes(p) && canStillAct(state, p)) return i;
    i = nextSeat(state.players.length, i);
  }
  return from;
};

export const rotateTurn = (state: SessionState): SessionState => {
  const start = nextSeat(state.players.length, state.activePlayerIndex);
  const idx = nextActiveIndex(state, start);
  const pid = state.players[idx];
  return { ...state, activePlayerIndex: idx, activePlayerId: pid };
};

export const omitPlayerKey = <T>(rec: Record<string, T>, userId: string): Record<string, T> => {
  const next = { ...rec };
  delete next[userId];
  return next;
};

export const withHandComplete = (state: SessionState): SessionState => ({
  ...state,
  handCompletedAt: state.handCompletedAt ?? Date.now()
});
