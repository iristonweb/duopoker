import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import {
  TABLE_STEP_MS,
  applyDisplayStep,
  buildTableSessionSteps,
  initHandDisplay,
  sessionSnap,
  type SessionSnap,
  type TableSessionStep
} from '../lib/table-session-steps';

export function useTableDisplayState(
  session: SessionState | undefined,
  heroId: string,
  formatAction: (action: PlayerAction) => string,
  reduceMotion: boolean
): SessionState | undefined {
  const [display, setDisplay] = useState<SessionState | undefined>(session);
  const prevRef = useRef<SessionSnap | null>(null);
  const targetRef = useRef<SessionState | undefined>(session);
  const queueRef = useRef<TableSessionStep[]>([]);
  const processingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayRef = useRef<SessionState | undefined>(session);

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
        timerRef.current = setTimeout(resolve, TABLE_STEP_MS);
      });
    }
    const target = targetRef.current;
    if (target) {
      displayRef.current = target;
      setDisplay(target);
    }
    processingRef.current = false;
  }, [heroId]);

  useEffect(() => {
    targetRef.current = session;
    if (!session) {
      prevRef.current = null;
      displayRef.current = undefined;
      setDisplay(undefined);
      return;
    }

    if (reduceMotion) {
      prevRef.current = sessionSnap(session);
      displayRef.current = session;
      setDisplay(session);
      return;
    }

    const prev = prevRef.current;
    const snap = sessionSnap(session);

    if (!prev) {
      prevRef.current = snap;
      displayRef.current = session;
      setDisplay(session);
      return;
    }

    const steps = buildTableSessionSteps(prev, session, formatAction);
    prevRef.current = snap;

    if (!steps.length) return;

    if (prev.handNumber !== snap.handNumber) {
      const seeded = initHandDisplay(session, heroId);
      displayRef.current = seeded;
      setDisplay(seeded);
    }

    queueRef.current.push(...steps);
    if (!processingRef.current) void drain();
  }, [session, heroId, formatAction, reduceMotion, drain]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return display;
}
