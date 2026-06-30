import type { GamePhase, ReplayFrame, SessionState } from '@duopoker/shared-types/index';
import { totalInKettle } from './holdem-table';

const flow: GamePhase[] = ['DEAL', 'PRE_FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];

export const nextPhase = (phase: GamePhase): GamePhase => {
  const idx = flow.indexOf(phase);
  return flow[(idx + 1) % flow.length];
};

export const createReplayTimeline = (state: SessionState): ReplayFrame[] =>
  (state.actionLog ?? []).map((action, idx) => ({
    at: action.at,
    actor: action.userId,
    action: action.type,
    phase: flow[Math.min(idx, flow.length - 1)],
    pot: totalInKettle(state)
  }));

export {
  createInitialState,
  dealToPlayers,
  isLegalAction,
  resolveWinner
} from './legacy';

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
export { parseLoadedSessionState, sessionStateSchema } from './session-schema';
export { computeSidePots, distributeSidePots, sortWinnersBySeat, winnersAmongEligible } from './pot-calculator';
export { bestStrengthFromSeven, strengthFiveCards, compareStrength, describeStrength } from './poker-eval';
export { createDeck, shuffle } from './cards';
export { evaluateHoldem, evaluateJoker, evaluateRaspisnoy } from './evaluator';
export { createJokerDeck, JOKER_WILD_IDS } from './joker-deck';
export {
  applyJokerAction,
  jokerTimeoutAction,
  pickBotJokerAction,
  startJokerHand,
  isJokerMatchComplete,
  runTuzovanie
} from './joker-table';
export { jokerPointsForHand, applyPoolPremiums, isPoolEndHand } from './joker-scoring';
export {
  amountToCall,
  BOT_USER_PREFIX,
  isAutomatedPlayer,
  maxRoundBet,
  pickBotAction
} from './bot-actions';
export { assertChipConservation, countChipsInPlay } from './invariants';
export {
  ACTION_TIMEOUT_MS,
  NEXT_HAND_DELAY_MS,
  BOT_THINK_MIN_MS,
  BOT_THINK_MAX_MS,
  BOT_THINK_RAISE_MIN_MS,
  BOT_THINK_RAISE_MAX_MS,
  buildAutoNextHand,
  enrichSessionMeta,
  playersWithChips,
  shouldAutoStartNextHand,
  shouldForceActionTimeout
} from './session-tick';
export {
  advanceBotTurnsRuntime,
  advanceSingleBotTurnRuntime,
  autoStartNextHandRuntime,
  enforceActionTimeoutRuntime,
  foldActivePlayerRuntime,
  tickSessionRuntime,
  type ProcessActionResult
} from './session-runtime';
