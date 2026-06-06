import { describe, expect, it } from 'vitest';
import { peekGhostCommunityFromDeck } from './ghost-board';
import { createDeck } from './cards';

describe('peekGhostCommunityFromDeck', () => {
  it('deals flop, turn, river with burns (5 cards total)', () => {
    const deck = createDeck();
    const ghost = peekGhostCommunityFromDeck(deck);
    expect(ghost).toHaveLength(5);
    const remaining = new Set(deck);
    for (const card of ghost) {
      expect(remaining.has(card)).toBe(true);
    }
    expect(new Set(ghost).size).toBe(5);
  });
});
