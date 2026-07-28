import type { Card, DisplaySessionState, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { computeSidePots, winnersAmongEligible } from '@duopoker/game-engine';
import { potIndexForChipFlight } from '../holdem/side-pots';

export const TABLE_STEP_MS = 300;
export const TABLE_ACTION_STEP_MS = 900;
export const TABLE_ACTION_JITTER_MS = 400;
export const TABLE_ACTION_RAISE_EXTRA_MS = 300;
export const TABLE_DEAL_STEP_MS = 450;
export const TABLE_BOARD_STEP_MS = 400;
export const TABLE_SHUFFLE_MS = 600;

const BOT_USER_PREFIX = 'duopoker-bot';

const isBotUserId = (userId: string): boolean => userId.startsWith(BOT_USER_PREFIX);

export type TableSessionStep =
  | { kind: 'shuffle' }
  | { kind: 'action'; userId: string; text: string; action: PlayerAction; potIndex?: number }
  | { kind: 'postBlind'; userId: string; amount: number; blindType: 'SB' | 'BB'; text: string }
  | { kind: 'collectBets' }
  | { kind: 'dealHole'; userId: string; cardIndex: number }
  | { kind: 'dealBoard'; cardIndex: number }
  | { kind: 'jokerPlay'; userId: string; card: Card }
  | { kind: 'winnerChips'; userId: string; amount: number; handNumber: number; potIndex?: number }
  | { kind: 'potPulse' };

export const stepDurationMs = (step: TableSessionStep): number => {
  switch (step.kind) {
    case 'shuffle':
      return TABLE_SHUFFLE_MS;
    case 'dealHole':
      return TABLE_DEAL_STEP_MS;
    case 'dealBoard':
      return TABLE_BOARD_STEP_MS;
    case 'action': {
      let ms = TABLE_ACTION_STEP_MS;
      if (isBotUserId(step.userId)) {
        ms += Math.floor(Math.random() * TABLE_ACTION_JITTER_MS);
      }
      if (
        step.action.type === 'raise' ||
        step.action.type === 'bet' ||
        step.action.type === 'bid'
      ) {
        ms += TABLE_ACTION_RAISE_EXTRA_MS;
      }
      return ms;
    }
    default:
      return TABLE_STEP_MS;
  }
};

export type SessionSnap = {
  handNumber: number;
  actionLen: number;
  street: string;
  boardLen: number;
  jokerTrickLen: number;
};

export const sessionSnap = (session: SessionState): SessionSnap => {
  const boardLen =
    session.mode === 'JOKER' && session.street === 'TRICKS' && session.joker
      ? session.joker.currentTrick.length
      : (session.communityCards?.length ?? 0);
  return {
    handNumber: session.handNumber,
    actionLen: session.actionLog?.length ?? 0,
    street: session.street ?? '',
    boardLen,
    jokerTrickLen: session.joker?.currentTrick.length ?? 0
  };
};

const appendPostBlindSteps = (
  steps: TableSessionStep[],
  session: SessionState,
  formatBlind: (type: 'SB' | 'BB', amount: number) => string
) => {
  if (session.mode !== 'HOLDEM') return;
  const bb = session.bigBlind ?? 0;
  const posted = new Set<string>();
  for (const uid of session.players) {
    const bet = session.playerRoundBet?.[uid] ?? 0;
    if (bet <= 0 || posted.has(uid)) continue;
    const blindType: 'SB' | 'BB' = bet >= bb ? 'BB' : 'SB';
    steps.push({
      kind: 'postBlind',
      userId: uid,
      amount: bet,
      blindType,
      text: formatBlind(blindType, bet)
    });
    posted.add(uid);
  }
};

export const buildTableSessionSteps = (
  prev: SessionSnap | null,
  session: SessionState,
  formatAction: (action: PlayerAction) => string,
  formatBlind?: (type: 'SB' | 'BB', amount: number) => string
): TableSessionStep[] => {
  if (!prev) {
    const steps: TableSessionStep[] = [];
    if (session.mode !== 'JOKER') {
      steps.push({ kind: 'shuffle' });
    }
    for (const uid of session.players) {
      const count =
        (session.playerCards[uid] ?? []).length ||
        (session.mode === 'JOKER' ? (session.joker?.cardsThisDeal ?? 2) : 2);
      for (let i = 0; i < count; i++) {
        steps.push({ kind: 'dealHole', userId: uid, cardIndex: i });
      }
    }
    if (formatBlind) appendPostBlindSteps(steps, session, formatBlind);
    return steps;
  }

  const steps: TableSessionStep[] = [];
  const snap = sessionSnap(session);

  if (prev.handNumber !== snap.handNumber) {
    if (session.mode !== 'JOKER') {
      steps.push({ kind: 'shuffle' });
    }
    const dealTargets = session.players;
    for (const uid of dealTargets) {
      const count = (session.playerCards[uid] ?? []).length || 2;
      for (let i = 0; i < count; i++) {
        steps.push({ kind: 'dealHole', userId: uid, cardIndex: i });
      }
    }

    if (formatBlind) appendPostBlindSteps(steps, session, formatBlind);

    return steps;
  }

  if (
    prev.street !== snap.street &&
    prev.street !== 'LOBBY' &&
    snap.street !== 'LOBBY' &&
    session.mode !== 'JOKER'
  ) {
    steps.push({ kind: 'collectBets' }, { kind: 'potPulse' });
  }

  if (snap.actionLen > prev.actionLen) {
    const newActions = session.actionLog!.slice(prev.actionLen);
    const simContrib = { ...(session.handContributions ?? {}) };
    for (const a of newActions) {
      if (['bet', 'call', 'raise'].includes(a.type) && (a.amount ?? 0) > 0) {
        simContrib[a.userId] = Math.max(0, (simContrib[a.userId] ?? 0) - (a.amount ?? 0));
      }
    }

    for (const action of newActions) {
      let potIndex: number | undefined;
      if (
        session.mode === 'HOLDEM' &&
        ['bet', 'call', 'raise'].includes(action.type) &&
        (action.amount ?? 0) > 0
      ) {
        const amount = action.amount ?? 0;
        const nextContrib = {
          ...simContrib,
          [action.userId]: (simContrib[action.userId] ?? 0) + amount
        };
        potIndex = potIndexForChipFlight(
          session.players,
          nextContrib,
          session.foldedPlayerIds,
          action.userId,
          amount
        );
        simContrib[action.userId] = nextContrib[action.userId]!;
      }

      steps.push({
        kind: 'action',
        userId: action.userId,
        text: formatAction(action),
        action,
        potIndex
      });
    }
  }

  if (snap.boardLen > prev.boardLen && session.mode !== 'JOKER') {
    for (let i = prev.boardLen; i < snap.boardLen; i++) {
      steps.push({ kind: 'dealBoard', cardIndex: i });
    }
  }

  if (session.mode === 'JOKER' && snap.jokerTrickLen > prev.jokerTrickLen && session.joker) {
    const trickCard = session.joker.currentTrick[snap.jokerTrickLen - 1];
    if (trickCard) {
      steps.push({ kind: 'jokerPlay', userId: trickCard.userId, card: trickCard.card });
    }
  }

  if (snap.street === 'COMPLETE' && prev.street !== 'COMPLETE') {
    if (session.mode === 'HOLDEM' && session.handContributions) {
      const folded = new Set(session.foldedPlayerIds ?? []);
      const pots = computeSidePots(session.players, session.handContributions, folded);
      if (pots.length > 1) {
        for (let i = 0; i < pots.length; i++) {
          const pot = pots[i]!;
          const tied = winnersAmongEligible(
            pot.eligible,
            session.playerCards,
            session.communityCards ?? [],
            'HOLDEM'
          );
          const share = Math.floor(pot.amount / tied.length);
          const remainder = pot.amount - share * tied.length;
          tied.forEach((uid, j) => {
            steps.push({
              kind: 'winnerChips',
              userId: uid,
              amount: share + (j < remainder ? 1 : 0),
              handNumber: session.handNumber,
              potIndex: i
            });
          });
        }
        steps.push({ kind: 'potPulse' });
        return steps;
      }
    }

    if (session.winners?.length) {
      for (const uid of session.winners) {
        steps.push({
          kind: 'winnerChips',
          userId: uid,
          amount: session.winnersShare?.[uid] ?? session.pot,
          handNumber: session.handNumber,
          potIndex: 0
        });
      }
      steps.push({ kind: 'potPulse' });
    }
  }

  return steps;
};

export const initHandDisplay = (target: SessionState, heroId: string): DisplaySessionState => {
  const display = structuredClone(target);
  display.communityCards = [];
  display.ghostCommunityCards = [];
  display.actionLog = [];
  if (display.joker) {
    display.joker = { ...display.joker, currentTrick: [] };
  }
  if (target.mode === 'HOLDEM' || target.mode === 'JOKER') {
    display.playerCards = Object.fromEntries(target.players.map((uid) => [uid, []]));
  } else if (heroId) {
    display.playerCards = { ...display.playerCards, [heroId]: [] };
  }
  if (target.mode === 'HOLDEM') {
    // Blinds animate via postBlind — start with empty round bets so catch-up isn't polluted.
    display.pot = 0;
    display.currentBet = 0;
    display.playerRoundBet = Object.fromEntries(target.players.map((uid) => [uid, 0]));
    // Hold turn until holes are dealt so the dock does not flash Check mid-shuffle.
    display.activePlayerIndex = -1;
  }
  return display;
};

export const applyDisplayStep = (
  display: DisplaySessionState,
  target: SessionState,
  step: TableSessionStep,
  heroId: string
): DisplaySessionState => {
  const next = structuredClone(display);

  switch (step.kind) {
    case 'shuffle':
      break;
    case 'dealHole': {
      const all = target.playerCards[step.userId] ?? [];
      const dealt = all.slice(0, step.cardIndex + 1);
      if (step.userId === heroId) {
        next.playerCards = { ...next.playerCards, [heroId]: dealt };
      } else {
        next.playerCards = {
          ...next.playerCards,
          [step.userId]: Array.from({ length: dealt.length }, (_, i) => `__${step.userId}_${i}` as const)
        };
      }
      const allDealt = target.players.every((uid) => {
        const expected = (target.playerCards[uid] ?? []).length;
        if (expected <= 0) return true;
        if (uid === heroId) {
          return (next.playerCards[heroId] ?? []).length >= expected;
        }
        const hidden = (next.playerCards[uid] ?? []).filter((c) => String(c).startsWith('__')).length;
        return hidden >= expected;
      });
      if (allDealt) {
        next.street = target.street;
        next.activePlayerIndex = target.activePlayerIndex;
        if (target.joker && next.joker) {
          next.joker = {
            ...next.joker,
            trumpSuit: target.joker.trumpSuit,
            matchHandIndex: target.joker.matchHandIndex,
            pool: target.joker.pool,
            cardsThisDeal: target.joker.cardsThisDeal,
            tricksWon: { ...target.joker.tricksWon }
          };
        }
      }
      break;
    }
    case 'postBlind': {
      // Do not move activePlayerIndex — blinds must not trip animationCatchUp / hide Check.
      next.playerRoundBet = { ...(next.playerRoundBet ?? {}), [step.userId]: step.amount };
      next.currentBet = Math.max(next.currentBet ?? 0, step.amount);
      break;
    }
    case 'action': {
      next.actionLog = [...(next.actionLog ?? []), step.action];
      const logLen = next.actionLog.length;
      const targetLen = target.actionLog?.length ?? 0;
      if (logLen >= targetLen) {
        next.activePlayerIndex = target.activePlayerIndex;
        next.stacks = { ...target.stacks };
        next.playerRoundBet = { ...(target.playerRoundBet ?? {}) };
        next.pot = target.pot;
        next.foldedPlayerIds = [...(target.foldedPlayerIds ?? [])];
        next.currentBet = target.currentBet;
      } else {
        const nextActorId = target.actionLog![logLen]?.userId;
        if (nextActorId) {
          const idx = next.players.indexOf(nextActorId);
          if (idx >= 0) next.activePlayerIndex = idx;
        }
        const uid = step.action.userId;
        if (step.action.type === 'fold') {
          next.foldedPlayerIds = [...(next.foldedPlayerIds ?? []), uid].filter(
            (id, i, arr) => arr.indexOf(id) === i
          );
        }
        if (['bet', 'call', 'raise'].includes(step.action.type)) {
          const paid = step.action.amount ?? 0;
          next.playerRoundBet = {
            ...(next.playerRoundBet ?? {}),
            [uid]: (display.playerRoundBet?.[uid] ?? 0) + paid
          };
        }
      }
      break;
    }
    case 'collectBets': {
      const roundTotal = Object.values(next.playerRoundBet ?? {}).reduce((sum, v) => sum + (v ?? 0), 0);
      next.pot = (next.pot ?? 0) + roundTotal;
      next.playerRoundBet = Object.fromEntries(next.players.map((uid) => [uid, 0]));
      next.currentBet = 0;
      // Do not jump to COMPLETE before board runout animates — keep prior street until settle.
      if (target.street !== 'COMPLETE') {
        next.street = target.street;
        next.activePlayerIndex = target.activePlayerIndex;
      } else {
        const boardLen = target.communityCards?.length ?? 0;
        const shown = next.communityCards?.length ?? 0;
        if (boardLen === 0 || shown >= boardLen) {
          next.street = 'COMPLETE';
          next.pot = target.pot;
          next.winners = target.winners ? [...target.winners] : undefined;
          next.activePlayerIndex = target.activePlayerIndex;
        }
      }
      break;
    }
    case 'dealBoard': {
      const board = target.communityCards ?? [];
      next.communityCards = board.slice(0, step.cardIndex + 1);
      const n = next.communityCards.length;
      if (target.street === 'COMPLETE' || target.phase === 'SHOWDOWN') {
        if (n >= 5) next.street = 'RIVER';
        else if (n >= 4) next.street = 'TURN';
        else if (n >= 3) next.street = 'FLOP';
      } else if (target.street !== 'COMPLETE') {
        next.street = target.street;
      }
      break;
    }
    case 'jokerPlay':
      if (target.joker && next.joker) {
        const idx = target.joker.currentTrick.findIndex(
          (c) => c.userId === step.userId && c.card === step.card
        );
        if (idx >= 0) {
          next.joker = {
            ...next.joker,
            currentTrick: target.joker.currentTrick.slice(0, idx + 1)
          };
        }
      }
      break;
    case 'potPulse':
      next.stacks = { ...target.stacks };
      if (target.street === 'COMPLETE') {
        const boardLen = target.communityCards?.length ?? 0;
        const shown = next.communityCards?.length ?? 0;
        if (boardLen === 0 || shown >= boardLen) {
          next.pot = target.pot;
          next.street = 'COMPLETE';
          next.winners = target.winners ? [...target.winners] : undefined;
          next.playerRoundBet = Object.fromEntries(next.players.map((uid) => [uid, 0]));
        }
      } else {
        next.pot = target.pot;
      }
      break;
    default:
      break;
  }

  return next;
};
