import { useEffect, useRef, useState } from 'react';
import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { formatCardLabel, suitLabel } from '../lib/joker-labels';
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

const formatCard = (card: Card, t: (key: string, opts?: Record<string, unknown>) => string): string =>
  formatCardLabel(card, t);

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
    case 'bid':
      return t('table.feedJokerBid', { name, amount: action.amount ?? 0 });
    case 'playCard':
      return t('table.feedJokerPlay', { name, card: action.card ? formatCard(action.card, t) : '?' });
    default:
      return `${name}: ${action.type}`;
  }
};

const playForAction = (action: PlayerAction, mode: SessionState['mode']) => {
  if (action.type === 'playCard' || (mode === 'JOKER' && action.type === 'bid')) {
    playCardSound();
    return;
  }
  if (action.type === 'fold') playFoldSound();
  else if (action.type === 'check') playCheckSound();
  else playChipSound();
};

const streetFeedText = (
  street: string,
  mode: SessionState['mode'],
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  if (mode === 'JOKER') {
    if (street === 'BIDDING') return t('table.feedJokerBidding');
    if (street === 'TRICKS') return t('table.feedJokerTricks');
  }
  return t('table.feedStreet', { street });
};

type JokerSnap = {
  trickNumber: number;
  trickLen: number;
  cardsThisDeal: number;
};

type FeedSoundOptions = {
  /** Action chip/card SFX — disabled when animation queue handles them */
  actionSounds?: boolean;
  /** Street transition SFX */
  streetSounds?: boolean;
  /** Hand start / blind SFX */
  handSounds?: boolean;
  /** Winner SFX */
  winSounds?: boolean;
};

export function useTableGameFeed(
  session: SessionState | undefined,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundEnabled = true,
  soundOptions: FeedSoundOptions = {}
) {
  const {
    actionSounds = true,
    streetSounds = true,
    handSounds = true,
    winSounds = true
  } = soundOptions;
  const [events, setEvents] = useState<GameFeedEvent[]>([]);
  const [pulseKey, setPulseKey] = useState(0);
  const prevRef = useRef<{
    handNumber: number;
    street: string;
    logLen: number;
    pot: number;
    joker?: JokerSnap;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      prevRef.current = null;
      setEvents([]);
      return;
    }

    const jokerSnap: JokerSnap | undefined = session.joker
      ? {
          trickNumber: session.joker.trickNumber,
          trickLen: session.joker.currentTrick.length,
          cardsThisDeal: session.joker.cardsThisDeal
        }
      : undefined;

    const snap = {
      handNumber: session.handNumber,
      street: session.street,
      logLen: session.actionLog?.length ?? 0,
      pot: kettle(session),
      joker: jokerSnap
    };

    const prev = prevRef.current;
    if (!prev) {
      prevRef.current = snap;
      return;
    }

    const next: GameFeedEvent[] = [];
    const push = (kind: GameFeedEvent['kind'], text: string) => {
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, kind, text, at: Date.now() });
    };

    if (session.handNumber > prev.handNumber && session.street !== 'LOBBY') {
      if (session.mode === 'JOKER' && session.joker) {
        push(
          'hand',
          t('table.feedJokerHand', {
            num: session.handNumber,
            cards: session.joker.cardsThisDeal,
            pool: session.joker.pool
          })
        );
        if (session.joker.trumpSuit) {
          push('system', t('table.feedJokerTrump', { suit: suitLabel(session.joker.trumpSuit, t) }));
        } else if (session.joker.trumpCard) {
          push('system', t('table.feedJokerNoTrumpDeal'));
        }
      } else {
        push('hand', t('table.feedNewHand', { num: session.handNumber }));
        push('blinds', t('table.feedBlinds', { sb: session.smallBlind, bb: session.bigBlind }));
        if (soundEnabled && handSounds) playBlindSound();
      }
    }

    if (session.street !== prev.street && session.street !== 'LOBBY' && session.street !== 'COMPLETE') {
      push('street', streetFeedText(session.street, session.mode, t));
      if (soundEnabled && streetSounds) playStreetSound();
    }

    const newActions = (session.actionLog ?? []).slice(prev.logLen);
    for (const action of newActions) {
      push('action', formatAction(action, label, t));
      if (soundEnabled && actionSounds) playForAction(action, session.mode);
    }

    if (
      session.mode === 'JOKER' &&
      session.joker &&
      prev.joker &&
      session.joker.trickNumber > prev.joker.trickNumber
    ) {
      push(
        'system',
        t('table.feedJokerTrickDone', {
          n: session.joker.trickNumber,
          total: session.joker.cardsThisDeal
        })
      );
      if (soundEnabled && actionSounds) playChipSound();
    }

    if (snap.pot > prev.pot + 0 && newActions.some((a) => a.type !== 'check' && a.type !== 'fold')) {
      if (soundEnabled && actionSounds && session.mode !== 'JOKER') playChipSound();
    }

    if (session.street === 'COMPLETE' && prev.street !== 'COMPLETE') {
      if (session.mode === 'JOKER' && session.joker?.handPoints) {
        const lines = session.players
          .map((p) => {
            const pts = session.joker!.handPoints![p];
            if (pts === undefined) return null;
            return t('table.feedJokerScoreLine', { name: label(p), pts });
          })
          .filter(Boolean)
          .join(' · ');
        push('winner', t('table.feedJokerHandDone', { summary: lines || '—' }));
      } else {
        const winners = (session.winners ?? []).map(label).join(', ') || '—';
        push('winner', t('table.feedWinner', { names: winners }));
      }
      if (soundEnabled && winSounds) playWinSound();
    }

    prevRef.current = snap;

    if (next.length) {
      setEvents((existing) => [...next, ...existing].slice(0, 120));
      setPulseKey((k) => k + 1);
    }
  }, [session, label, t, soundEnabled]);

  return { events, pulseKey };
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
