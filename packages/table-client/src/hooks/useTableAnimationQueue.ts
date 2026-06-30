import { useEffect, useRef, useState } from 'react';
import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { formatCardLabel } from '../joker/labels';
import { formatSeatActionShort, type SeatActionKind } from '../feed/seat-action-format';
import {
  buildTableSessionSteps,
  sessionSnap,
  stepDurationMs,
  type SessionSnap,
  type TableSessionStep
} from '../session/table-session-steps';
import type { TableAnimationCallbacks } from './types';

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
  potIndex?: number;
};

export type JokerCardFlight = {
  id: string;
  userId: string;
  card: Card;
};

const BUBBLE_MS = 3800;
const FOLD_FX_MS = 700;
const CHECK_RIPPLE_MS = 700;

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
      return action.allIn
        ? t('table.feedAllIn', { name, amount: action.amount ?? 0 })
        : t('table.feedCall', { name, amount: action.amount ?? 0 });
    case 'bet':
      return action.allIn
        ? t('table.feedAllIn', { name, amount: action.amount ?? 0 })
        : t('table.feedBet', { name, amount: action.amount ?? 0 });
    case 'raise':
      return action.allIn
        ? t('table.feedAllIn', { name, amount: action.amount ?? 0 })
        : t('table.feedRaise', { name, amount: action.raiseBy ?? action.amount ?? 0 });
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
  heroId: string,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundOn: boolean,
  reduceMotion: boolean,
  callbacks: TableAnimationCallbacks = {}
) {
  const { haptic, playSound } = callbacks;
  const prevRef = useRef<SessionSnap | null>(null);
  const queueRef = useRef<TableSessionStep[]>([]);
  const processingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dealSoundPlayedRef = useRef(false);
  const sessionIdRef = useRef<string | undefined>(session?.sessionId);

  const [seatBubbles, setSeatBubbles] = useState<SeatActionBubble[]>([]);
  const [chipFlights, setChipFlights] = useState<ChipFlight[]>([]);
  const [jokerFlights, setJokerFlights] = useState<JokerCardFlight[]>([]);
  const [potPulseKey, setPotPulseKey] = useState(0);
  const [foldingUsers, setFoldingUsers] = useState<string[]>([]);
  const [checkRippleUsers, setCheckRippleUsers] = useState<string[]>([]);
  const [deckShuffling, setDeckShuffling] = useState(false);

  const resetAnimationPipeline = () => {
    queueRef.current = [];
    processingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    prevRef.current = null;
    dealSoundPlayedRef.current = false;
    sessionIdRef.current = undefined;
    setSeatBubbles([]);
    setChipFlights([]);
    setJokerFlights([]);
    setFoldingUsers([]);
    setCheckRippleUsers([]);
    setDeckShuffling(false);
  };

  const cardFmt = (c: Card) => formatCardLabel(c, t);

  const pushBubble = (id: string, userId: string, text: string, kind: SeatActionKind) => {
    setSeatBubbles((prev) => [...prev.filter((b) => b.userId !== userId), { id, userId, text, kind }]);
    setTimeout(() => setSeatBubbles((prev) => prev.filter((b) => b.id !== id)), BUBBLE_MS);
  };

  const pushChipFlight = (
    flightId: string,
    userId: string,
    amount: number,
    kind: 'toPot' | 'toWinner',
    potIndex = 0
  ) => {
    setChipFlights((prev) => [...prev, { id: flightId, userId, amount, kind, potIndex }]);
    setTimeout(
      () => setChipFlights((prev) => prev.filter((f) => f.id !== flightId)),
      kind === 'toWinner' ? 900 : 700
    );
  };

  const applyStep = (step: TableSessionStep) => {
    switch (step.kind) {
      case 'action': {
        const id = `${step.action.at}-${step.userId}`;
        const short = formatSeatActionShort(step.action, t, cardFmt);
        pushBubble(id, step.userId, short.label, short.kind);

        if (soundOn) {
          if (step.action.type === 'playCard' || step.action.type === 'bid') playSound?.('card');
          else if (step.action.type === 'fold') playSound?.('fold');
          else if (step.action.type === 'check') playSound?.('check');
          else if (['bet', 'call', 'raise'].includes(step.action.type)) playSound?.('chip');
        }

        if (step.action.type === 'fold') {
          haptic?.(step.userId === heroId ? 'error' : 'light');
          setFoldingUsers((prev) => [...prev, step.userId]);
          setTimeout(() => setFoldingUsers((prev) => prev.filter((u) => u !== step.userId)), FOLD_FX_MS);
        }
        if (step.action.type === 'check') {
          setCheckRippleUsers((prev) => [...prev, step.userId]);
          setTimeout(() => setCheckRippleUsers((prev) => prev.filter((u) => u !== step.userId)), CHECK_RIPPLE_MS);
        }
        if (step.action.type === 'bid') {
          haptic?.(step.userId === heroId ? 'light' : 'light');
        }

        if (['bet', 'call', 'raise'].includes(step.action.type) && (step.action.amount ?? 0) > 0) {
          pushChipFlight(
            `chip-${step.action.at}-${step.userId}`,
            step.userId,
            step.action.amount ?? 0,
            'toPot',
            step.potIndex ?? 0
          );
        }
        break;
      }
      case 'postBlind': {
        const id = `blind-${step.userId}-${step.amount}`;
        const kind = step.blindType === 'SB' ? 'blindSB' : 'blindBB';
        pushBubble(id, step.userId, step.text, kind);
        if (soundOn) playSound?.('blind');
        if (step.amount > 0) {
          pushChipFlight(`blind-chip-${step.userId}`, step.userId, step.amount, 'toPot');
        }
        break;
      }
      case 'collectBets':
        setPotPulseKey((k) => k + 1);
        if (soundOn) playSound?.('chip');
        break;
      case 'shuffle':
        setDeckShuffling(true);
        if (soundOn) playSound?.('shuffle');
        setTimeout(() => setDeckShuffling(false), stepDurationMs(step));
        break;
      case 'dealHole':
        if (!dealSoundPlayedRef.current) {
          dealSoundPlayedRef.current = true;
          if (soundOn) playSound?.('card');
        }
        break;
      case 'dealBoard':
        if (soundOn) playSound?.('card');
        break;
      case 'jokerPlay': {
        const flightId = `joker-${Date.now()}-${step.userId}`;
        setJokerFlights((prev) => [...prev, { id: flightId, userId: step.userId, card: step.card }]);
        if (soundOn) playSound?.('card');
        setTimeout(() => setJokerFlights((prev) => prev.filter((f) => f.id !== flightId)), 800);
        break;
      }
      case 'potPulse':
        setPotPulseKey((k) => k + 1);
        break;
      case 'winnerChips':
        haptic?.(step.userId === heroId ? 'success' : 'light');
        pushChipFlight(
          `win-${step.handNumber}-${step.potIndex ?? 0}-${step.userId}`,
          step.userId,
          step.amount,
          'toWinner',
          step.potIndex ?? 0
        );
        if (soundOn) playSound?.('chip');
        break;
      default:
        break;
    }
  };

  const enqueue = (steps: TableSessionStep[]) => {
    if (reduceMotion) {
      for (const step of steps) applyStep(step);
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
        timerRef.current = setTimeout(resolve, stepDurationMs(step));
      });
    }
    processingRef.current = false;
  };

  useEffect(() => {
    if (!session) {
      resetAnimationPipeline();
      return;
    }

    if (sessionIdRef.current && sessionIdRef.current !== session.sessionId) {
      resetAnimationPipeline();
    }
    sessionIdRef.current = session.sessionId;

    const prev = prevRef.current;
    const snap = sessionSnap(session);

    if (!prev) {
      prevRef.current = snap;
      return;
    }

    if (prev.handNumber !== snap.handNumber) {
      dealSoundPlayedRef.current = false;
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
  }, [session, heroId, label, t, soundOn, reduceMotion]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { seatBubbles, chipFlights, jokerFlights, potPulseKey, foldingUsers, checkRippleUsers, deckShuffling };
}
