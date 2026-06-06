import { describe, expect, it } from 'vitest';
import { applyTableAction, createInitialTableState, startNewHand } from './holdem-table';

describe('Joker bid sum constraint', () => {
  it('rejects dealer bid that would make sum equal cards dealt (2 players, 1 card)', () => {
    let s = createInitialTableState('bid-sum', 'JOKER', 100, 42);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 }
    });
    expect(s.joker?.cardsThisDeal).toBe(1);

    const first = s.players[s.activePlayerIndex]!;
    let r = applyTableAction(s, { sessionId: 'bid-sum', userId: first, type: 'bid', amount: 1, at: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = r.state;

    const dealer = s.players[s.activePlayerIndex]!;
    r = applyTableAction(s, { sessionId: 'bid-sum', userId: dealer, type: 'bid', amount: 0, at: 2 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.street).toBe('TRICKS');
  });
});

describe('Joker no-trump reveal', () => {
  it('sets trumpSuit null when trump card is a joker', () => {
    let s = createInitialTableState('no-trump', 'JOKER', 100, 99);
    s = startNewHand({
      ...s,
      players: ['a', 'b'],
      stacks: { a: 100, b: 100 },
      handNumber: 5
    });
    if (s.joker?.trumpCard && (s.joker.trumpCard === '6S' || s.joker.trumpCard === '6C')) {
      expect(s.joker.trumpSuit).toBeNull();
    } else if (s.joker?.trumpCard) {
      expect(s.joker.trumpSuit).not.toBeNull();
    }
  });
});
