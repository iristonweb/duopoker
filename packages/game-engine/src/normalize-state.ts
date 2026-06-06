import type { SessionState } from '@duopoker/shared-types/index';

/** Ensure persisted snapshots include fields added after initial release. */
export const normalizeSessionState = (state: SessionState): SessionState => ({
  ...state,
  allInPlayerIds: state.allInPlayerIds ?? [],
  actedThisRound: state.actedThisRound ?? {},
  handContributions: state.handContributions ?? {},
  readyForNextHand: state.readyForNextHand ?? [],
  handCompletedAt: state.handCompletedAt,
  actionDeadlineAt: state.actionDeadlineAt
});
