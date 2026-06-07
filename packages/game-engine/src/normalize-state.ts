import type { SessionState } from '@duopoker/shared-types/index';

const legacyMode = (mode: SessionState['mode'] | 'RASPISNOY'): SessionState['mode'] =>
  mode === 'RASPISNOY' ? 'JOKER' : mode;

/** Ensure persisted snapshots include fields added after initial release. */
export const normalizeSessionState = (state: SessionState): SessionState => ({
  ...state,
  mode: legacyMode(state.mode as SessionState['mode'] | 'RASPISNOY'),
  allInPlayerIds: state.allInPlayerIds ?? [],
  lastRaiseSize: state.lastRaiseSize ?? state.bigBlind ?? 2,
  actedThisRound: state.actedThisRound ?? {},
  handContributions: state.handContributions ?? {},
  readyForNextHand: state.readyForNextHand ?? [],
  handCompletedAt: state.handCompletedAt,
  actionDeadlineAt: state.actionDeadlineAt,
  jokerRules: state.jokerRules,
  joker: state.joker
    ? {
        ...state.joker,
        bids: state.joker.bids ?? {},
        tricksWon: state.joker.tricksWon ?? {},
        scores: state.joker.scores ?? {},
        currentTrick: state.joker.currentTrick ?? [],
        dealHistory: state.joker.dealHistory ?? [],
        poolPremiums: state.joker.poolPremiums,
        tuzovanieLog: state.joker.tuzovanieLog
      }
    : undefined
});
