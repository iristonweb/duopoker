import type { GamePhase, PlayerAction, ReplayFrame, SessionState } from '@duopoker/shared-types/index';
import { createDeck, shuffle } from './cards';
import { evaluateHoldem, evaluateRaspisnoy } from './evaluator';
import { SeededRng } from './rng';

const flow: GamePhase[] = ['DEAL', 'PRE_FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];

export const nextPhase = (phase: GamePhase): GamePhase => {
  const idx = flow.indexOf(phase);
  return flow[(idx + 1) % flow.length];
};

export const createInitialState = (sessionId: string, mode: SessionState['mode']): SessionState => ({
  sessionId,
  mode,
  phase: 'DEAL',
  pot: 0,
  communityCards: [],
  playerCards: {},
  foldedPlayerIds: [],
  actionLog: []
});

export const dealToPlayers = (state: SessionState, playerIds: string[], seed = Date.now()): SessionState => {
  const rng = new SeededRng(seed);
  const deck = shuffle(createDeck(), rng);
  const cardsPerPlayer = state.mode === 'HOLDEM' ? 2 : 5;
  const playerCards: Record<string, string[]> = {};
  playerIds.forEach((id, idx) => {
    playerCards[id] = deck.slice(idx * cardsPerPlayer, idx * cardsPerPlayer + cardsPerPlayer);
  });
  return { ...state, playerCards };
};

export const isLegalAction = (state: SessionState, action: PlayerAction): boolean => {
  if (state.foldedPlayerIds?.includes(action.userId)) return false;
  if (action.type === 'check') return (action.amount ?? 0) === 0;
  return true;
};

export const applyAction = (state: SessionState, action: PlayerAction): SessionState => {
  if (!isLegalAction(state, action)) return state;
  const folded =
    action.type === 'fold'
      ? [...(state.foldedPlayerIds ?? []), action.userId]
      : (state.foldedPlayerIds ?? []);
  return {
    ...state,
    pot: state.pot + Math.max(0, action.amount ?? 0),
    foldedPlayerIds: folded,
    actionLog: [...(state.actionLog ?? []), action]
  };
};

export const createReplayTimeline = (state: SessionState): ReplayFrame[] =>
  (state.actionLog ?? []).map((action, idx) => ({
    at: action.at,
    actor: action.userId,
    action: action.type,
    phase: flow[Math.min(idx, flow.length - 1)],
    pot: (state.actionLog ?? []).slice(0, idx + 1).reduce((sum, item) => sum + (item.amount ?? 0), 0)
  }));

export const resolveWinner = (state: SessionState): { winnerId?: string; score: number } => {
  const cards = state.playerCards ?? {};
  let winnerId: string | undefined;
  let bestScore = -1;
  Object.entries(cards).forEach(([userId, hand]) => {
    if (state.foldedPlayerIds?.includes(userId)) return;
    const score = state.mode === 'HOLDEM' ? evaluateHoldem(hand) : evaluateRaspisnoy(hand);
    if (score > bestScore) {
      bestScore = score;
      winnerId = userId;
    }
  });
  return { winnerId, score: bestScore };
};
