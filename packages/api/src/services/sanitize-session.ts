import { sanitizeStateForViewer } from '@duopoker/game-engine/index';
import type { SessionState } from '@duopoker/shared-types/index';
import { getUserSubscriptionTier } from './private-table-auth.js';

export const sanitizeSessionForUser = async (
  state: SessionState,
  userId: string
): Promise<SessionState> => {
  const subscriptionTier = await getUserSubscriptionTier(userId);
  return sanitizeStateForViewer(state, userId, { subscriptionTier });
};
