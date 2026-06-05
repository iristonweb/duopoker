import type { Card, SessionState } from '@duopoker/shared-types/index';

const HIDDEN: Card[] = [];

/** Cards visible to all players (showdown / hand complete). */
const cardsRevealedToAll = (state: SessionState): boolean =>
  state.street === 'SHOWDOWN' || state.street === 'COMPLETE';

/**
 * Strip server-only secrets before sending state to a client.
 * Hides deck always; hides opponents' hole cards until showdown.
 */
export const sanitizeStateForViewer = (
  state: SessionState,
  viewerId: string | undefined
): SessionState => {
  const revealAll = cardsRevealedToAll(state);
  const playerCards: Record<string, Card[]> = {};

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
    playerCards
  };
};
