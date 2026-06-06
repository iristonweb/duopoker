import type { SessionState } from '@duopoker/shared-types/index';

const legacyMode = (mode: SessionState['mode'] | 'RASPISNOY'): SessionState['mode'] =>
  mode === 'RASPISNOY' ? 'JOKER' : mode;

/** Ensure persisted snapshots include fields added after initial release. */
export const normalizeSessionState = (state: SessionState): SessionState => ({
  ...state,
  mode: legacyMode(state.mode as SessionState['mode'] | 'RASPISNOY'),
  allInPlayerIds: state.allInPlayerIds ?? [],
  actedThisRound: state.actedThisRound ?? {},
  handContributions: state.handContributions ?? {},
  readyForNextHand: state.readyForNextHand ?? [],
  handCompletedAt: state.handCompletedAt,
  actionDeadlineAt: state.actionDeadlineAt
});
