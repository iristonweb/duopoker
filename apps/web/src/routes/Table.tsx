import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  GlassPanel,
  Input,
  LoadingSkeleton,
  PageShell,
  SectionHeader
} from '@duopoker/ui-kit';
import type { EquippedCosmetics, SessionState, SubscriptionTier } from '@duopoker/shared-types/index';
import { defaultEquipped } from '@duopoker/shared-types';
import { PokerTable3D, type TablePlayerVisual } from '../components/PokerTable3D';
import { PlayingCard } from '../components/cosmetics/PlayingCard';
import { VoiceRoom } from '../components/VoiceRoom';
import { useAppStore } from '../store/useAppStore';
import { usesRealtimeSocket } from '../config/api';

const maxRoundBet = (s: SessionState) =>
  s.players.reduce((m, p) => Math.max(m, s.playerRoundBet[p] ?? 0), 0);

const amountToCall = (s: SessionState, uid: string) =>
  Math.max(0, maxRoundBet(s) - (s.playerRoundBet[uid] ?? 0));

export const Table = () => {
  const { t } = useTranslation();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const session = useAppStore((s) => s.session);
  const userId = useAppStore((s) => s.userId);
  const playerAction = useAppStore((s) => s.playerAction);
  const readyNextHand = useAppStore((s) => s.readyNextHand);
  const connect = useAppStore((s) => s.connect);
  const socket = useAppStore((s) => s.socket);
  const joinSession = useAppStore((s) => s.joinSession);
  const pollSession = useAppStore((s) => s.pollSession);
  const stopPolling = useAppStore((s) => s.stopPolling);
  const mode = useAppStore((s) => s.mode);

  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);

  const [playerProfiles, setPlayerProfiles] = useState<
    Record<
      string,
      {
        name: string;
        avatar?: string | null;
        subscriptionTier: SubscriptionTier;
        equipped: EquippedCosmetics;
      }
    >
  >({});

  useEffect(() => {
    if (!routeSessionId || !session?.players?.length) return;
    const apiFetch = useAppStore.getState().apiFetch;
    void apiFetch(`/game/session/${encodeURIComponent(routeSessionId)}/players`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            players?: Array<{
              userId: string;
              nickname?: string | null;
              displayName: string;
              avatar?: string | null;
              subscriptionTier?: SubscriptionTier;
              equipped?: EquippedCosmetics;
            }>;
          } | null
        ) => {
          if (!data?.players) return;
          const map: typeof playerProfiles = {};
          for (const p of data.players) {
            map[p.userId] = {
              name: p.nickname ? `@${p.nickname}` : p.displayName,
              avatar: p.avatar,
              subscriptionTier: p.subscriptionTier ?? 'FREE',
              equipped: p.equipped ?? defaultEquipped()
            };
          }
          setPlayerProfiles(map);
        }
      )
      .catch(() => undefined);
  }, [routeSessionId, session?.players?.length, session?.handNumber]);

  const [raiseAmount, setRaiseAmount] = useState(0);

  const activeId = useMemo(() => {
    if (!session || session.players.length === 0) return undefined;
    return session.players[session.activePlayerIndex];
  }, [session]);

  const label = (uid: string) => playerProfiles[uid]?.name ?? uid.slice(0, 8);

  const tablePlayers = useMemo((): TablePlayerVisual[] => {
    if (!session) return [];
    const visuals = session.players.map((uid) => {
      const profile = playerProfiles[uid];
      const hero = uid === userId;
      return {
        userId: uid,
        name: profile?.name ?? uid.slice(0, 8),
        stack: session.stacks[uid] ?? 0,
        avatar: profile?.avatar,
        tier: hero ? subscriptionTier : (profile?.subscriptionTier ?? 'FREE'),
        equipped: hero ? equipped : profile?.equipped,
        holeCards: session.playerCards[uid] ?? [],
        revealCards: hero,
        isActive: uid === activeId,
        isFolded: session.foldedPlayerIds.includes(uid)
      };
    });
    return [...visuals].sort((a, b) => {
      if (a.userId === userId) return 1;
      if (b.userId === userId) return -1;
      return 0;
    });
  }, [session, playerProfiles, userId, subscriptionTier, equipped, activeId]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!routeSessionId) return;
    if (usesRealtimeSocket()) {
      joinSession(routeSessionId, mode);
      socket?.emit('reconnectSession', { sessionId: routeSessionId });
      return;
    }
    void joinSession(routeSessionId, mode);
    pollSession(routeSessionId);
    return () => stopPolling();
  }, [routeSessionId, joinSession, pollSession, stopPolling, mode, socket]);

  const sid = session?.sessionId;
  const matchRoute = sid && routeSessionId && sid === routeSessionId;

  useEffect(() => {
    if (session?.bigBlind) setRaiseAmount(session.bigBlind);
  }, [session?.bigBlind, session?.handNumber]);

  if (!routeSessionId) {
    return (
      <PageShell maxWidth="lg">
        <GlassPanel className="border-white/10 p-6 text-muted">{t('table.invalid')}</GlassPanel>
      </PageShell>
    );
  }

  if (!matchRoute || !session) {
    return (
      <PageShell
        maxWidth="lg"
        back={
          <Link to="/lobby" className="premium-link text-sm">
            {t('nav.backLobby')}
          </Link>
        }
        eyebrow={t('table.connecting')}
        title={t('table.joiningTitle')}
      >
        <GlassPanel glow="gold" className="border-gold/15 p-6">
          <LoadingSkeleton lines={2} className="mb-4" />
          <p className="text-sm text-muted">
            {t('table.connectingTo', { id: routeSessionId })}
          </p>
          <p className="mt-2 text-xs text-subtle">{t('table.connectingHint')}</p>
        </GlassPanel>
      </PageShell>
    );
  }

  const need = amountToCall(session, userId);
  const myTurn = activeId === userId && session.street !== 'LOBBY' && session.street !== 'COMPLETE';
  const kettle =
    session.pot +
    Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  return (
    <PageShell
      maxWidth="5xl"
      contentClassName="pb-12 pt-8"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          {t('nav.backLobby')}
        </Link>
      }
      headerAction={
        <Badge variant="gold">
          {t('table.pot')} {kettle.toLocaleString()}
        </Badge>
      }
    >
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">{t('table.liveTable')}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ivory sm:text-3xl">
          {session.mode === 'HOLDEM' ? t('table.holdem') : t('table.raspisnoy')}
        </h1>
        <p className="mt-1 font-mono text-xs text-subtle">{session.sessionId}</p>
      </div>

      {session.street && session.street !== 'LOBBY' ? (
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 shadow-panel ring-1 ring-white/5">
          <PokerTable3D
            communityCards={session.mode === 'HOLDEM' ? (session.communityCards ?? []) : []}
            pot={kettle}
            street={session.street}
            players={tablePlayers}
            heroDeckId={equipped.deck}
            heroChipId={equipped.chip}
          />
        </div>
      ) : null}

      <GlassPanel glow={myTurn ? 'gold' : 'none'} className="border-white/10 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="emerald">{session.street}</Badge>
          {activeId ? (
            <span className="text-sm text-muted">
              {t('table.toAct')}{' '}
              <span className="font-medium text-zinc-200">
                {label(activeId)}
                {activeId === userId ? ` ${t('table.you')}` : ''}
              </span>
            </span>
          ) : null}
        </div>
        <p className="mt-3 rounded-xl border border-white/5 bg-black/25 px-3 py-2 font-mono text-sm text-zinc-200">
          {t('table.yourHole')} {(session.playerCards[userId] ?? []).join(' ') || '—'}
        </p>
        {(session.playerCards[userId] ?? []).length ? (
          <div className="mt-3 flex gap-2">
            {(session.playerCards[userId] ?? []).map((c, i) => (
              <PlayingCard key={`${c}-${i}`} card={c} faceUp deckId={equipped.deck} size="sm" />
            ))}
          </div>
        ) : null}

        {session.street === 'COMPLETE' ? (
          <div className="mt-5 border-t border-white/10 pt-5">
            <SectionHeader
              eyebrow={t('table.handResult')}
              title={t('table.handComplete')}
              description={t('table.winners', {
                names: (session.winners ?? []).map(label).join(', ') || '—'
              })}
              className="mb-4"
            />
            <p className="text-xs text-subtle">
              {t('table.ready', {
                ready: (session.readyForNextHand ?? []).length,
                total: session.players.length
              })}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              disabled={(session.readyForNextHand ?? []).includes(userId)}
              onClick={() => readyNextHand()}
            >
              {(session.readyForNextHand ?? []).includes(userId) ? t('table.waitingOthers') : t('table.nextHand')}
            </Button>
          </div>
        ) : null}

        {myTurn ? (
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gold/80">
              {t('table.yourAction', { amount: need })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => playerAction({ sessionId: sid, type: 'fold' })}>
                {t('table.fold')}
              </Button>
              {need === 0 ? (
                <Button variant="secondary" size="sm" onClick={() => playerAction({ sessionId: sid, type: 'check' })}>
                  {t('table.check')}
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => playerAction({ sessionId: sid, type: 'call' })}>
                  {t('table.call', { amount: need })}
                </Button>
              )}
              <div className="flex flex-1 flex-wrap items-end gap-2 sm:flex-none">
                <Input
                  type="number"
                  min={session.bigBlind}
                  label={t('table.raise')}
                  className="w-28"
                  value={raiseAmount || session.bigBlind}
                  onChange={(e) => setRaiseAmount(Number(e.target.value) || session.bigBlind)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    playerAction({
                      sessionId: sid,
                      type: session.currentBet > 0 ? 'raise' : 'bet',
                      amount: raiseAmount || session.bigBlind
                    })
                  }
                >
                  {session.currentBet > 0 ? t('table.raise') : t('table.bet')}
                </Button>
              </div>
            </div>
          </div>
        ) : session.street !== 'COMPLETE' ? (
          <p className="mt-4 text-sm text-muted">{t('table.waitingOpponent')}</p>
        ) : null}
      </GlassPanel>

      <GlassPanel className="mt-6 border-white/10 p-5">
        <SectionHeader eyebrow={t('table.voiceEyebrow')} title={t('table.voiceTitle')} className="mb-2" />
        <VoiceRoom />
      </GlassPanel>
    </PageShell>
  );
};
