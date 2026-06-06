import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';

export const TABLE_STEP_MS = 300;

export type TableSessionStep =
  | { kind: 'action'; userId: string; text: string; action: PlayerAction }
  | { kind: 'postBlind'; userId: string; amount: number; blindType: 'SB' | 'BB'; text: string }
  | { kind: 'collectBets' }
  | { kind: 'dealHole'; userId: string; cardIndex: number }
  | { kind: 'dealBoard'; cardIndex: number }
  | { kind: 'jokerPlay'; userId: string; card: Card }
  | { kind: 'winnerChips'; userId: string; amount: number; handNumber: number }
  | { kind: 'potPulse' };

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

export const buildTableSessionSteps = (
  prev: SessionSnap | null,
  session: SessionState,
  formatAction: (action: PlayerAction) => string,
  formatBlind?: (type: 'SB' | 'BB', amount: number) => string,
  heroId?: string
): TableSessionStep[] => {
  if (!prev) return [];

  const steps: TableSessionStep[] = [];
  const snap = sessionSnap(session);

  if (prev.handNumber !== snap.handNumber) {
    const dealTargets = heroId ? [heroId] : session.players;
    for (const uid of dealTargets) {
      const count = (session.playerCards[uid] ?? []).length || 2;
      for (let i = 0; i < count; i++) {
        steps.push({ kind: 'dealHole', userId: uid, cardIndex: i });
      }
    }

    if (session.mode === 'HOLDEM' && formatBlind) {
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
    }

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
    for (const action of newActions) {
      if (action.type === 'playCard' && action.card && session.mode === 'JOKER') {
        steps.push({ kind: 'jokerPlay', userId: action.userId, card: action.card });
      }
      steps.push({
        kind: 'action',
        userId: action.userId,
        text: formatAction(action),
        action
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

  if (snap.street === 'COMPLETE' && prev.street !== 'COMPLETE' && session.winners?.length) {
    for (const uid of session.winners) {
      steps.push({ kind: 'winnerChips', userId: uid, amount: session.pot, handNumber: session.handNumber });
    }
    steps.push({ kind: 'potPulse' });
  }

  return steps;
};

export const initHandDisplay = (target: SessionState, heroId: string): SessionState => {
  const display = structuredClone(target);
  display.communityCards = [];
  display.ghostCommunityCards = [];
  display.actionLog = [];
  if (display.joker) {
    display.joker = { ...display.joker, currentTrick: [] };
  }
  if (heroId) {
    display.playerCards = { ...display.playerCards, [heroId]: [] };
  }
  return display;
};

export const applyDisplayStep = (
  display: SessionState,
  target: SessionState,
  step: TableSessionStep,
  heroId: string
): SessionState => {
  const next = structuredClone(display);

  switch (step.kind) {
    case 'dealHole':
      if (step.userId === heroId) {
        const all = target.playerCards[heroId] ?? [];
        next.playerCards = {
          ...next.playerCards,
          [heroId]: all.slice(0, step.cardIndex + 1)
        };
      }
      break;
    case 'postBlind': {
      next.playerRoundBet = { ...(next.playerRoundBet ?? {}), [step.userId]: step.amount };
      next.activePlayerIndex = target.activePlayerIndex;
      break;
    }
    case 'action': {
      next.actionLog = [...(next.actionLog ?? []), step.action];
      next.activePlayerIndex = target.activePlayerIndex;
      const logLen = next.actionLog.length;
      const targetLen = target.actionLog?.length ?? 0;
      if (logLen >= targetLen) {
        next.stacks = { ...target.stacks };
        next.playerRoundBet = { ...(target.playerRoundBet ?? {}) };
        next.pot = target.pot;
        next.foldedPlayerIds = [...(target.foldedPlayerIds ?? [])];
        next.currentBet = target.currentBet;
      } else {
        const uid = step.action.userId;
        if (step.action.type === 'fold') {
          next.foldedPlayerIds = [...(next.foldedPlayerIds ?? []), uid].filter(
            (id, i, arr) => arr.indexOf(id) === i
          );
        }
        if (['bet', 'call', 'raise'].includes(step.action.type)) {
          next.playerRoundBet = {
            ...(next.playerRoundBet ?? {}),
            [uid]: step.action.amount ?? next.playerRoundBet?.[uid] ?? 0
          };
        }
      }
      break;
    }
    case 'collectBets': {
      next.playerRoundBet = Object.fromEntries(next.players.map((uid) => [uid, 0]));
      next.pot = target.pot;
      next.street = target.street;
      break;
    }
    case 'dealBoard': {
      const board = target.communityCards ?? [];
      next.communityCards = board.slice(0, step.cardIndex + 1);
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
      next.pot = target.pot;
      if (target.street === 'COMPLETE') {
        next.street = target.street;
        next.winners = target.winners ? [...target.winners] : undefined;
        next.playerRoundBet = Object.fromEntries(next.players.map((uid) => [uid, 0]));
      }
      break;
    default:
      break;
  }

  return next;
};
