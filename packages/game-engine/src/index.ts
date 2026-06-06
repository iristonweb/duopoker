import type { Card, GamePhase, PlayerAction, ReplayFrame, SessionState } from '@duopoker/shared-types/index';
import { createDeck, shuffle } from './cards';
import { createJokerDeck } from './joker-deck';
import { jokerCardsPerHand } from './joker-schedule';
import { compareStrength, strengthFiveFromHand, bestStrengthFromSeven, parseCard } from './poker-eval';
import { createInitialTableState, totalInKettle } from './holdem-table';
import { SeededRng } from './rng';

const flow: GamePhase[] = ['DEAL', 'PRE_FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];

export const nextPhase = (phase: GamePhase): GamePhase => {
  const idx = flow.indexOf(phase);
  return flow[(idx + 1) % flow.length];
};

/** @deprecated use createInitialTableState */
export const createInitialState = (sessionId: string, mode: SessionState['mode']): SessionState =>
  createInitialTableState(sessionId, mode, 100, Date.now());

export const dealToPlayers = (state: SessionState, playerIds: string[], seed = Date.now()): SessionState => {
  const rng = new SeededRng(seed);
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
  return { ...state, playerCards, deck: d as Card[], seed };
};

export const isLegalAction = (state: SessionState, action: PlayerAction): boolean => {
  if (state.foldedPlayerIds?.includes(action.userId)) return false;
  if (action.type === 'check') return (action.amount ?? 0) === 0;
  return true;
};

export const createReplayTimeline = (state: SessionState): ReplayFrame[] =>
  (state.actionLog ?? []).map((action, idx) => ({
    at: action.at,
    actor: action.userId,
    action: action.type,
    phase: flow[Math.min(idx, flow.length - 1)],
    pot: totalInKettle(state)
  }));

export const resolveWinner = (state: SessionState): { winnerId?: string; score: number } => {
  if (state.mode === 'HOLDEM') {
    const folded = new Set(state.foldedPlayerIds ?? []);
    let best: string | undefined;
    let bestCmp = -1;
    const board = state.communityCards ?? [];
    for (const [uid, hole] of Object.entries(state.playerCards ?? {})) {
      if (folded.has(uid) || !hole || hole.length < 2) continue;
      const s = bestStrengthFromSeven(hole, board);
      const cmp = s.reduce((acc, n, i) => acc + n * 15 ** (6 - i), 0);
      if (cmp > bestCmp) {
        bestCmp = cmp;
        best = uid;
      }
    }
    return { winnerId: best, score: bestCmp };
  }
  const folded = new Set(state.foldedPlayerIds ?? []);
  let best: string | undefined;
  let bestStr: ReturnType<typeof strengthFiveFromHand> | undefined;
  for (const [uid, hand] of Object.entries(state.playerCards ?? {})) {
    if (folded.has(uid) || !hand?.length) continue;
    const s =
      hand.length >= 5
        ? strengthFiveFromHand(hand)
        : ([0, ...hand.map((c) => parseCard(c).rank).sort((a, b) => b - a)] as const);
    if (!bestStr || compareStrength(s, bestStr) > 0) {
      bestStr = s;
      best = uid;
    }
  }
  return { winnerId: best, score: bestStr?.[0] ?? 0 };
};

export {
  addPlayerToTable,
  applyTableAction,
  autoFoldActivePlayer,
  createInitialTableState,
  markReadyForNextHand,
  removePlayerFromTable,
  startNewHand,
  totalInKettle,
  sbBbIndices
} from './holdem-table';
export { sanitizeStateForViewer, type SanitizeViewerOptions } from './viewer-state';
export { peekGhostCommunityFromDeck } from './ghost-board';
export { normalizeSessionState } from './normalize-state';
export { computeSidePots, distributeSidePots } from './pot-calculator';
export { bestStrengthFromSeven, strengthFiveCards, compareStrength, describeStrength } from './poker-eval';
export { createDeck, shuffle } from './cards';
export { SeededRng } from './rng';
export { evaluateHoldem, evaluateJoker, evaluateRaspisnoy } from './evaluator';
export { createJokerDeck, JOKER_WILD_IDS } from './joker-deck';
export {
  amountToCall,
  BOT_USER_PREFIX,
  isAutomatedPlayer,
  maxRoundBet,
  pickBotAction
} from './bot-actions';
export {
  ACTION_TIMEOUT_MS,
  NEXT_HAND_DELAY_MS,
  buildAutoNextHand,
  enrichSessionMeta,
  playersWithChips,
  shouldAutoStartNextHand,
  shouldForceActionTimeout
} from './session-tick';
