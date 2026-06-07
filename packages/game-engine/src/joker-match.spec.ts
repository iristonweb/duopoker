import { describe, expect, it } from 'vitest';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { isJokerCard, jokerLegalPlays, leadSuitFromTrick } from '@duopoker/shared-types/index';
import {
  applyTableAction,
  createInitialTableState,
  markReadyForNextHand,
  startNewHand
} from './holdem-table';
import { isJokerMatchComplete, jokerTimeoutAction, pickBotJokerAction } from './joker-table';

const PLAYERS = ['b0', 'b1', 'b2', 'b3'];

const jokerActionCandidates = (state: SessionState, userId: string): PlayerAction[] => {
  const at = Date.now();
  const base = { sessionId: state.sessionId, userId, at };
  const out: PlayerAction[] = [pickBotJokerAction(state, userId), jokerTimeoutAction(state, userId)];

  if (state.street === 'TRICKS' && state.joker) {
    const hand = state.playerCards[userId] ?? [];
    const lead = leadSuitFromTrick(state.joker.currentTrick);
    const legal = jokerLegalPlays(hand, lead, state.joker.trumpSuit, state.jokerRules?.strictJoker);
    for (const card of legal) {
      out.push({
        ...base,
        type: 'playCard',
        card,
        declaration: isJokerCard(card) ? 'senior' : undefined
      });
    }
  }

  return out;
};

const stepJoker = (state: SessionState): SessionState => {
  const actor = state.players[state.activePlayerIndex]!;
  for (const action of jokerActionCandidates(state, actor)) {
    const r = applyTableAction(state, action);
    if (r.ok) return r.state;
  }
  throw new Error(`stuck on ${state.street} for ${actor}`);
};

const playHandToComplete = (state: SessionState): SessionState => {
  let s = state;
  for (let guard = 0; guard < 600 && s.street !== 'COMPLETE'; guard += 1) {
    s = stepJoker(s);
  }
  if (s.street !== 'COMPLETE') {
    throw new Error(`hand did not complete (street=${s.street})`);
  }
  return s;
};

const readyAllAndMaybeStart = (state: SessionState): SessionState => {
  let s = state;
  for (const p of s.players) {
    const r = markReadyForNextHand(s, p);
    if (!r.ok) throw new Error(r.reason);
    s = r.state;
    if (r.started) return s;
  }
  return s;
};

const startFourPlayerMatch = (seed: number, jokerRules?: SessionState['jokerRules']) => {
  const s = createInitialTableState('match24', 'JOKER', 100, seed, jokerRules);
  return startNewHand({
    ...s,
    players: PLAYERS,
    stacks: Object.fromEntries(PLAYERS.map((p) => [p, 100]))
  });
};

describe('Joker full match simulation', () => {
  it(
    'plays 24 hands with 4 players and blocks hand 25',
    () => {
      let s = startFourPlayerMatch(4242);

      for (let guard = 0; guard < 28 && !isJokerMatchComplete(s); guard += 1) {
        const handIdx = s.joker?.matchHandIndex;
        s = playHandToComplete(s);
        expect(s.joker?.handPoints).toBeDefined();

        if (isJokerMatchComplete(s)) break;

        const handNumberBefore = s.handNumber;
        s = readyAllAndMaybeStart(s);
        expect(s.handNumber).toBe(handNumberBefore + 1);
        expect(s.joker?.matchHandIndex).toBe(((handIdx ?? 0) + 1) % 24);
        expect(s.street).not.toBe('COMPLETE');
      }

      expect(isJokerMatchComplete(s)).toBe(true);
      expect(s.joker?.matchHandIndex).toBe(23);
      expect(s.joker?.dealHistory?.length).toBe(24);

      const blocked = markReadyForNextHand(s, PLAYERS[0]!);
      expect(blocked.ok).toBe(true);
      if (!blocked.ok) return;
      expect(blocked.started).toBe(false);
    },
    120_000
  );

  it('records pool premiums object after pool boundaries', () => {
    let s = startFourPlayerMatch(5151);

    while ((s.joker?.matchHandIndex ?? 0) < 7 || s.street !== 'COMPLETE') {
      s = playHandToComplete(s);
      if ((s.joker?.matchHandIndex ?? 0) >= 7 && s.street === 'COMPLETE') break;
      s = readyAllAndMaybeStart(s);
    }

    expect(s.joker?.matchHandIndex).toBe(7);
    expect(s.joker?.dealHistory?.length).toBeGreaterThanOrEqual(8);
    expect(s.joker?.poolPremiums).toBeDefined();
  }, 60_000);

  it('uses minus scoring when jokerRules.scoringMode is minus', () => {
    let s = startFourPlayerMatch(6161, { scoringMode: 'minus' });
    s = playHandToComplete(s);
    const pts = Object.values(s.joker?.handPoints ?? {});
    expect(pts.length).toBe(4);
    expect(s.jokerRules?.scoringMode).toBe('minus');
  });
});
