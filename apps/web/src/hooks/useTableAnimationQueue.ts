import { useEffect, useRef, useState } from 'react';
import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { formatCardLabel } from '../lib/joker-labels';
import {
  formatSeatActionShort,
  type SeatActionKind
} from '../lib/seat-action-format';
import {
  playBlindSound,
  playCardSound,
  playCheckSound,
  playChipSound,
  playFoldSound
} from '../lib/table-sounds';
import {
  TABLE_STEP_MS,
  buildTableSessionSteps,
  sessionSnap,
  type SessionSnap,
  type TableSessionStep
} from '../lib/table-session-steps';

export type SeatActionBubble = {
  id: string;
  userId: string;
  text: string;
  kind: SeatActionKind;
};

export type ChipFlight = {
  id: string;
  userId: string;
  amount: number;
  kind: 'toPot' | 'toWinner';
};

export type JokerCardFlight = {
  id: string;
  userId: string;
  card: Card;
};

const BUBBLE_MS = 3800;

const formatActionText = (
  action: PlayerAction,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  const name = label(action.userId);
  switch (action.type) {
    case 'fold':
      return t('table.feedFold', { name });
    case 'check':
      return t('table.feedCheck', { name });
    case 'call':
      return t('table.feedCall', { name, amount: action.amount ?? 0 });
    case 'bet':
      return t('table.feedBet', { name, amount: action.amount ?? 0 });
    case 'raise':
      return t('table.feedRaise', { name, amount: action.amount ?? 0 });
    case 'bid':
      return t('table.feedJokerBid', { name, amount: action.amount ?? 0 });
    case 'playCard':
      return t('table.feedJokerPlay', {
        name,
        card: action.card ? formatCardLabel(action.card, t) : '?'
      });
    default:
      return `${name}: ${action.type}`;
  }
};

export function useTableAnimationQueue(
  session: SessionState | undefined,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundOn: boolean,
  reduceMotion: boolean
) {
  const prevRef = useRef<SessionSnap | null>(null);
  const queueRef = useRef<TableSessionStep[]>([]);
  const processingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [seatBubbles, setSeatBubbles] = useState<SeatActionBubble[]>([]);
  const [chipFlights, setChipFlights] = useState<ChipFlight[]>([]);
  const [jokerFlights, setJokerFlights] = useState<JokerCardFlight[]>([]);
  const [potPulseKey, setPotPulseKey] = useState(0);
  const [dealTick, setDealTick] = useState(0);
  const [foldingUsers, setFoldingUsers] = useState<string[]>([]);
  const [checkRippleUsers, setCheckRippleUsers] = useState<string[]>([]);

  const cardFmt = (c: Card) => formatCardLabel(c, t);

  const pushBubble = (id: string, userId: string, text: string, kind: SeatActionKind) => {
    setSeatBubbles((prev) => [...prev.filter((b) => b.userId !== userId), { id, userId, text, kind }]);
    setTimeout(() => setSeatBubbles((prev) => prev.filter((b) => b.id !== id)), BUBBLE_MS);
  };

  const pushChipFlight = (flightId: string, userId: string, amount: number, kind: 'toPot' | 'toWinner') => {
    setChipFlights((prev) => [...prev, { id: flightId, userId, amount, kind }]);
    setTimeout(() => setChipFlights((prev) => prev.filter((f) => f.id !== flightId)), kind === 'toWinner' ? 900 : 700);
  };

  const enqueue = (steps: TableSessionStep[]) => {
    if (reduceMotion) {
      for (const step of steps) {
        if (step.kind === 'action') {
          const short = formatSeatActionShort(step.action, t, cardFmt);
          pushBubble(`${step.action.at}-${step.userId}`, step.userId, short.label, short.kind);
        }
        if (step.kind === 'postBlind') {
          const kind = step.blindType === 'SB' ? 'blindSB' : 'blindBB';
          pushBubble(`blind-${step.userId}-${step.amount}`, step.userId, step.text, kind);
        }
        if (step.kind === 'potPulse') setPotPulseKey((k) => k + 1);
      }
      return;
    }
    queueRef.current.push(...steps);
    if (!processingRef.current) void drain();
  };

  const drain = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const step = queueRef.current.shift()!;
      applyStep(step);
      await new Promise<void>((resolve) => {
        timerRef.current = setTimeout(resolve, TABLE_STEP_MS);
      });
    }
    processingRef.current = false;
  };

  const applyStep = (step: TableSessionStep) => {
    switch (step.kind) {
      case 'action': {
        const id = `${step.action.at}-${step.userId}`;
        const short = formatSeatActionShort(step.action, t, cardFmt);
        pushBubble(id, step.userId, short.label, short.kind);

        if (soundOn) {
          if (step.action.type === 'playCard' || step.action.type === 'bid') playCardSound();
          else if (step.action.type === 'fold') playFoldSound();
          else if (step.action.type === 'check') playCheckSound();
          else if (['bet', 'call', 'raise'].includes(step.action.type)) playChipSound();
        }

        if (step.action.type === 'fold') {
          setFoldingUsers((prev) => [...prev, step.userId]);
          setTimeout(() => setFoldingUsers((prev) => prev.filter((u) => u !== step.userId)), 450);
        }
        if (step.action.type === 'check') {
          setCheckRippleUsers((prev) => [...prev, step.userId]);
          setTimeout(() => setCheckRippleUsers((prev) => prev.filter((u) => u !== step.userId)), 600);
        }

        if (['bet', 'call', 'raise'].includes(step.action.type) && (step.action.amount ?? 0) > 0) {
          pushChipFlight(`chip-${step.action.at}-${step.userId}`, step.userId, step.action.amount ?? 0, 'toPot');
        }
        break;
      }
      case 'postBlind': {
        const id = `blind-${step.userId}-${step.amount}`;
        const kind = step.blindType === 'SB' ? 'blindSB' : 'blindBB';
        pushBubble(id, step.userId, step.text, kind);
        if (soundOn) playBlindSound();
        if (step.amount > 0) {
          pushChipFlight(`blind-chip-${step.userId}`, step.userId, step.amount, 'toPot');
        }
        break;
      }
      case 'collectBets':
        setPotPulseKey((k) => k + 1);
        if (soundOn) playChipSound();
        break;
      case 'dealHole':
        setDealTick((k) => k + 1);
        if (soundOn) playCardSound();
        break;
      case 'dealBoard':
        setDealTick((k) => k + 1);
        if (soundOn) playCardSound();
        break;
      case 'jokerPlay': {
        const flightId = `joker-${Date.now()}-${step.userId}`;
        setJokerFlights((prev) => [...prev, { id: flightId, userId: step.userId, card: step.card }]);
        if (soundOn) playCardSound();
        setTimeout(() => setJokerFlights((prev) => prev.filter((f) => f.id !== flightId)), 800);
        break;
      }
      case 'potPulse':
        setPotPulseKey((k) => k + 1);
        break;
      case 'winnerChips':
        pushChipFlight(`win-${step.handNumber}-${step.userId}`, step.userId, step.amount, 'toWinner');
        if (soundOn) playChipSound();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!session) {
      prevRef.current = null;
      return;
    }

    const prev = prevRef.current;
    const snap = sessionSnap(session);

    if (!prev) {
      prevRef.current = snap;
      return;
    }

    const formatBlind = (type: 'SB' | 'BB', amount: number) =>
      type === 'SB'
        ? t('table.postsBlindSB', { amount })
        : t('table.postsBlindBB', { amount });

    const steps = buildTableSessionSteps(
      prev,
      session,
      (action) => formatActionText(action, label, t),
      formatBlind
    );

    if (steps.length) enqueue(steps);
    prevRef.current = snap;
  }, [session, label, t, soundOn, reduceMotion]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { seatBubbles, chipFlights, jokerFlights, potPulseKey, dealTick, foldingUsers, checkRippleUsers };
}
