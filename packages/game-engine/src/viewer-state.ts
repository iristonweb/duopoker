import type { Card, SessionState, SubscriptionTier } from '@duopoker/shared-types/index';
import { GHOST_BOARD_MIN_TIER, tierMeetsRequirement } from '@duopoker/shared-types';

const HIDDEN: Card[] = [];

/** Cards visible to all players (showdown / hand complete). */
const cardsRevealedToAll = (state: SessionState): boolean =>
  state.street === 'SHOWDOWN' || state.street === 'COMPLETE';

export type SanitizeViewerOptions = {
  subscriptionTier?: SubscriptionTier;
};

/**
 * Strip server-only secrets before sending state to a client.
 * Hides deck always; hides opponents' hole cards until showdown.
 * Ghost board is only included for subscribed viewers.
 */
export const sanitizeStateForViewer = (
  state: SessionState,
  viewerId: string | undefined,
  options?: SanitizeViewerOptions
): SessionState => {
  const revealAll = cardsRevealedToAll(state);
  const playerCards: Record<string, Card[]> = {};
  const tier = options?.subscriptionTier ?? 'FREE';
  const canSeeGhostBoard = tierMeetsRequirement(tier, GHOST_BOARD_MIN_TIER);

  for (const pid of state.players) {
    const cards = state.playerCards[pid];
    if (!cards?.length) {
      playerCards[pid] = [];
      continue;
    }
    if (revealAll || pid === viewerId) {
      playerCards[pid] = [...cards];
    } else {
      playerCards[pid] = HIDDEN;
    }
  }

  return {
    ...state,
    deck: [],
    playerCards,
    ghostCommunityCards:
      canSeeGhostBoard && state.ghostCommunityCards?.length
        ? [...state.ghostCommunityCards]
        : undefined
  };
};
