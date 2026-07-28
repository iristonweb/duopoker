import { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplaySessionState, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import {
  applyDisplayStep,
  buildTableSessionSteps,
  initHandDisplay,
  sessionSnap,
  stepDurationMs,
  type SessionSnap,
  type TableSessionStep
} from '../session/table-session-steps';

export function useTableDisplayState(
  session: SessionState | undefined,
  heroId: string,
  formatAction: (action: PlayerAction) => string,
  reduceMotion: boolean,
  formatBlind?: (type: 'SB' | 'BB', amount: number) => string
): SessionState | DisplaySessionState | undefined {
  const [display, setDisplay] = useState<SessionState | DisplaySessionState | undefined>(session);
  const prevRef = useRef<SessionSnap | null>(null);
  const targetRef = useRef<SessionState | undefined>(session);
  const queueRef = useRef<TableSessionStep[]>([]);
  const processingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayRef = useRef<SessionState | DisplaySessionState | undefined>(session);
  const sessionIdRef = useRef<string | undefined>(session?.sessionId);

  const resetDisplayPipeline = useCallback(() => {
    queueRef.current = [];
    processingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    prevRef.current = null;
    targetRef.current = undefined;
    displayRef.current = undefined;
    sessionIdRef.current = undefined;
    setDisplay(undefined);
  }, []);

  const drain = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    while (queueRef.current.length > 0) {
      const step = queueRef.current.shift()!;
      const target = targetRef.current;
      if (target && displayRef.current) {
        const next = applyDisplayStep(displayRef.current, target, step, heroId);
        displayRef.current = next;
        setDisplay(next);
      }
      await new Promise<void>((resolve) => {
        timerRef.current = setTimeout(resolve, stepDurationMs(step));
      });
    }
    processingRef.current = false;
    if (queueRef.current.length > 0) {
      void drain();
      return;
    }
    const target = targetRef.current;
    if (target) {
      displayRef.current = target;
      setDisplay(target);
    }
  }, [heroId]);

  useEffect(() => {
    if (!session) {
      resetDisplayPipeline();
      return;
    }

    if (sessionIdRef.current && sessionIdRef.current !== session.sessionId) {
      resetDisplayPipeline();
    }
    sessionIdRef.current = session.sessionId;

    targetRef.current = session;

    if (reduceMotion) {
      prevRef.current = sessionSnap(session);
      displayRef.current = session;
      setDisplay(session);
      return;
    }

    const prev = prevRef.current;
    const snap = sessionSnap(session);

    if (!prev) {
      const initial = initHandDisplay(session, heroId);
      prevRef.current = snap;
      displayRef.current = initial;
      setDisplay(initial);
      queueRef.current = buildTableSessionSteps(null, session, formatAction, formatBlind);
      if (queueRef.current.length) void drain();
      else {
        displayRef.current = session;
        setDisplay(session);
      }
      return;
    }

    const steps = buildTableSessionSteps(prev, session, formatAction, formatBlind);
    if (steps.length) {
      if (prev.handNumber !== snap.handNumber) {
        // Clear prior hand visuals before deal/blinds so action math isn't polluted mid-queue.
        const initial = initHandDisplay(session, heroId);
        displayRef.current = initial;
        setDisplay(initial);
        queueRef.current = steps;
      } else {
        queueRef.current.push(...steps);
      }
      if (!processingRef.current) void drain();
    } else if (!processingRef.current) {
      displayRef.current = session;
      setDisplay(session);
    }

    prevRef.current = snap;
  }, [session, heroId, formatAction, formatBlind, reduceMotion, drain, resetDisplayPipeline]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return display;
}
