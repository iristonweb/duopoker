import { useEffect, useRef, useState } from 'react';
import type { PlayerAction, SessionState } from '@duopoker/shared-types/index';
import {
  playBlindSound,
  playCardSound,
  playCheckSound,
  playChipSound,
  playFoldSound,
  playStreetSound,
  playWinSound
} from '../lib/table-sounds';

export type GameFeedEvent = {
  id: string;
  kind: 'action' | 'street' | 'hand' | 'blinds' | 'winner' | 'system';
  text: string;
  at: number;
};

const kettle = (s: SessionState) =>
  s.pot + Object.values(s.playerRoundBet ?? {}).reduce((sum, v) => sum + (typeof v === 'number' ? v : 0), 0);

const formatAction = (
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
    default:
      return `${name}: ${action.type}`;
  }
};

const playForAction = (action: PlayerAction) => {
  if (action.type === 'fold') playFoldSound();
  else if (action.type === 'check') playCheckSound();
  else playChipSound();
};

export function useTableGameFeed(
  session: SessionState | undefined,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundEnabled = true
) {
  const [events, setEvents] = useState<GameFeedEvent[]>([]);
  const prevRef = useRef<{
    handNumber: number;
    street: string;
    logLen: number;
    pot: number;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      prevRef.current = null;
      setEvents([]);
      return;
    }

    const snap = {
      handNumber: session.handNumber,
      street: session.street,
      logLen: session.actionLog?.length ?? 0,
      pot: kettle(session)
    };

    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = snap;
      return;
    }

    const next: GameFeedEvent[] = [];
    const push = (kind: GameFeedEvent['kind'], text: string) => {
      next.push({ id: `${Date.now()}-${Math.random()}`, kind, text, at: Date.now() });
    };

    if (session.handNumber > prev.handNumber && session.street !== 'LOBBY') {
      push('hand', t('table.feedNewHand', { num: session.handNumber }));
      push(
        'blinds',
        t('table.feedBlinds', { sb: session.smallBlind, bb: session.bigBlind })
      );
      if (soundEnabled) playBlindSound();
    }

    if (session.street !== prev.street && session.street !== 'LOBBY' && session.street !== 'COMPLETE') {
      push('street', t('table.feedStreet', { street: session.street }));
      if (soundEnabled) playStreetSound();
    }

    const newActions = (session.actionLog ?? []).slice(prev.logLen);
    for (const action of newActions) {
      push('action', formatAction(action, label, t));
      if (soundEnabled) playForAction(action);
    }

    if (snap.pot > prev.pot + 0 && newActions.some((a) => a.type !== 'check' && a.type !== 'fold')) {
      if (soundEnabled) playChipSound();
    }

    if (session.street === 'COMPLETE' && prev.street !== 'COMPLETE') {
      const winners = (session.winners ?? []).map(label).join(', ') || '—';
      push('winner', t('table.feedWinner', { names: winners }));
      if (soundEnabled) playWinSound();
    }

    prevRef.current = snap;

    if (next.length) {
      setEvents((existing) => [...next, ...existing].slice(0, 40));
    }
  }, [session, label, t, soundEnabled]);

  return events;
}

/** Play deal sound when community cards increase. */
export function useCommunityCardSounds(
  communityCount: number,
  soundEnabled = true
) {
  const prev = useRef(communityCount);
  useEffect(() => {
    if (communityCount > prev.current && soundEnabled) playCardSound();
    prev.current = communityCount;
  }, [communityCount, soundEnabled]);
}
