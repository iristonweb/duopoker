import { useEffect, useRef, useState } from 'react';
import type { Card, PlayerAction, SessionState } from '@duopoker/shared-types/index';
import { formatCardLabel, suitLabel } from '../joker/labels';
import { formatJokerPlayLine } from '../joker/declaration-label';
import { holdemShowdownHandLines } from '../holdem/hand-rank';
import { leaderboardFeedKey, leaderboardLeaders } from '../leaderboard/table-leaderboard';
import type { TableSoundKind } from './types';

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
    case 'playCard': {
      const card = action.card ? formatCard(action.card, t) : '?';
      const cardLine = action.declaration
        ? formatJokerPlayLine(card, action.declaration, t)
        : card;
      return t('table.feedJokerPlay', { name, card: cardLine });
    }
    case 'chooseTrump':
      return action.trumpSuit
        ? t('table.feedJokerTrumpChoice', { name, suit: suitLabel(action.trumpSuit, t) })
        : t('table.feedJokerNoTrumpChoice', { name });
    default:
      return `${name}: ${action.type}`;
  }
};

const playForAction = (action: PlayerAction, mode: SessionState['mode'], playSound?: (k: TableSoundKind) => void) => {
  if (action.type === 'playCard' || (mode === 'JOKER' && action.type === 'bid')) {
    playSound?.('card');
    return;
  }
  if (action.type === 'fold') playSound?.('fold');
  else if (action.type === 'check') playSound?.('check');
  else playSound?.('chip');
};

const streetFeedText = (
  street: string,
  mode: SessionState['mode'],
  t: (key: string, opts?: Record<string, unknown>) => string
): string => {
  if (mode === 'JOKER') {
    if (street === 'BIDDING') return t('table.feedJokerBidding');
    if (street === 'TRICKS') return t('table.feedJokerTricks');
    if (street === 'TRUMP_CHOICE') return t('table.jokerTrumpChoicePrompt');
  }
  return t('table.feedStreet', { street });
};

type JokerSnap = {
  trickNumber: number;
  trickLen: number;
  cardsThisDeal: number;
  lastTrickWinner?: string;
};

type FeedSoundOptions = {
  actionSounds?: boolean;
  streetSounds?: boolean;
  handSounds?: boolean;
  winSounds?: boolean;
};

export function useTableGameFeed(
  session: SessionState | undefined,
  label: (uid: string) => string,
  t: (key: string, opts?: Record<string, unknown>) => string,
  soundEnabled = true,
  soundOptions: FeedSoundOptions = {},
  playSound?: (kind: TableSoundKind) => void
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
    boardLen: number;
    leaderKey?: string;
    joker?: JokerSnap;
    tuzovanieShown?: boolean;
  } | null>(null);
  const tuzovaniePlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session || session.mode !== 'JOKER' || session.handNumber !== 1) return;
    const log = session.joker?.tuzovanieLog;
    if (!log?.length) return;
    const key = `${session.sessionId}-tuz`;
    if (tuzovaniePlayedRef.current === key) return;
    tuzovaniePlayedRef.current = key;

    const staggerMs = 450;
    const timers: ReturnType<typeof setTimeout>[] = [];

    log.forEach((entry, i) => {
      timers.push(
        setTimeout(() => {
          const ev: GameFeedEvent = {
            id: `tuz-${i}-${Math.random().toString(36).slice(2, 6)}`,
            kind: 'system',
            text: t('table.feedJokerTuzovanie', {
              name: label(entry.userId),
              card: formatCard(entry.card, t)
            }),
            at: Date.now()
          };
          setEvents((prev) => [...prev.slice(-48), ev]);
          setPulseKey((k) => k + 1);
          if (soundEnabled && handSounds) playSound?.('card');
        }, i * staggerMs)
      );
    });

    timers.push(
      setTimeout(() => {
        const dealerUid = session.players[session.dealerIndex];
        if (!dealerUid) return;
        const ev: GameFeedEvent = {
          id: `tuz-dealer-${Date.now()}`,
          kind: 'system',
          text: t('table.feedJokerTuzovanieDealer', { name: label(dealerUid) }),
          at: Date.now()
        };
        setEvents((prev) => [...prev.slice(-48), ev]);
        setPulseKey((k) => k + 1);
      }, log.length * staggerMs)
    );

    return () => timers.forEach(clearTimeout);
  }, [session, label, t, soundEnabled, handSounds, playSound]);

  useEffect(() => {
    if (!session) {
      prevRef.current = null;
      setEvents([]);
      return;
    }

    const boardLen = session.communityCards?.length ?? 0;
    const jokerSnap: JokerSnap | undefined = session.joker
      ? {
          trickNumber: session.joker.trickNumber,
          trickLen: session.joker.currentTrick.length,
          cardsThisDeal: session.joker.cardsThisDeal,
          lastTrickWinner: session.joker.lastTrickWinner
        }
      : undefined;

    const snap = {
      handNumber: session.handNumber,
      street: session.street,
      logLen: session.actionLog?.length ?? 0,
      pot: kettle(session),
      boardLen,
      leaderKey: leaderboardFeedKey(session),
      joker: jokerSnap,
      tuzovanieShown: prevRef.current?.tuzovanieShown
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

    if (session.joker?.tuzovanieLog?.length) {
      snap.tuzovanieShown = true;
    }

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
        } else if (session.joker.trumpCard && session.street !== 'TRUMP_CHOICE') {
          push('system', t('table.feedJokerNoTrumpDeal'));
        }
      } else {
        push('hand', t('table.feedNewHand', { num: session.handNumber }));
        push('blinds', t('table.feedBlinds', { sb: session.smallBlind, bb: session.bigBlind }));
        if (soundEnabled && handSounds) playSound?.('blind');
      }
    }

    if (session.street !== prev.street && session.street !== 'LOBBY' && session.street !== 'COMPLETE') {
      push('street', streetFeedText(session.street, session.mode, t));
      if (soundEnabled && streetSounds) playSound?.('street');
    }

    if (
      session.mode !== 'JOKER' &&
      boardLen > prev.boardLen &&
      prev.street !== session.street &&
      session.street === 'COMPLETE'
    ) {
      if (prev.boardLen < 3 && boardLen >= 3) push('street', t('table.feedRunoutFlop'));
      if (prev.boardLen < 4 && boardLen >= 4) push('street', t('table.feedRunoutTurn'));
      if (prev.boardLen < 5 && boardLen >= 5) push('street', t('table.feedRunoutRiver'));
    }

    const newActions = (session.actionLog ?? []).slice(prev.logLen);
    for (const action of newActions) {
      push('action', formatAction(action, label, t));
      if (soundEnabled && actionSounds) playForAction(action, session.mode, playSound);
    }

    if (
      session.mode === 'JOKER' &&
      session.joker &&
      prev.joker &&
      session.joker.trickNumber > prev.joker.trickNumber
    ) {
      const winnerId = session.joker.lastTrickWinner;
      push(
        'system',
        t('table.feedJokerTrickDone', {
          n: session.joker.trickNumber,
          total: session.joker.cardsThisDeal,
          name: winnerId ? label(winnerId) : '—'
        })
      );
      if (soundEnabled && actionSounds) playSound?.('chip');
    }

    if (snap.pot > prev.pot + 0 && newActions.some((a) => a.type !== 'check' && a.type !== 'fold')) {
      if (soundEnabled && actionSounds && session.mode !== 'JOKER') playSound?.('chip');
    }

    if (
      prev.leaderKey &&
      snap.leaderKey &&
      snap.leaderKey !== prev.leaderKey &&
      session.players.length > 1
    ) {
      const leaderNames = leaderboardLeaders(session).map(label).join(', ');
      push('winner', t('table.feedLeaderChanged', { names: leaderNames || '—' }));
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

        const poolPremiums = session.joker.poolPremiums;
        if (poolPremiums && Object.keys(poolPremiums).length > 0) {
          const premiumLines = Object.entries(poolPremiums)
            .map(([uid, pts]) => t('table.feedJokerScoreLine', { name: label(uid), pts }))
            .join(' · ');
          push('system', t('table.feedJokerPoolPremium', { pool: session.joker.pool, summary: premiumLines }));
        }
      } else {
        const winners = (session.winners ?? []).map(label).join(', ') || '—';
        if (session.winnersShare) {
          const shares = (session.winners ?? [])
            .map((uid) => t('table.feedWinnerShare', { name: label(uid), amount: session.winnersShare![uid] ?? 0 }))
            .join(' · ');
          push('winner', shares || t('table.feedWinner', { names: winners }));
        } else {
          push('winner', t('table.feedWinner', { names: winners }));
        }
        const handLine = holdemShowdownHandLines(session, label, t);
        if (handLine) push('system', handLine);
      }
      if (soundEnabled && winSounds) playSound?.('win');
    }

    prevRef.current = snap;

    if (next.length) {
      setEvents((existing) => [...next, ...existing].slice(0, 120));
      setPulseKey((k) => k + 1);
    }
  }, [session, label, t, soundEnabled, actionSounds, streetSounds, handSounds, winSounds, playSound]);

  return { events, pulseKey };
}

export function useCommunityCardSounds(
  communityCount: number,
  soundEnabled = true,
  playSound?: (kind: TableSoundKind) => void
) {
  const prev = useRef(communityCount);
  useEffect(() => {
    if (communityCount > prev.current && soundEnabled) playSound?.('card');
    prev.current = communityCount;
  }, [communityCount, soundEnabled, playSound]);
}
