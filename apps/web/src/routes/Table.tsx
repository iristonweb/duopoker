import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button, GlassPanel, LoadingSkeleton, PageShell } from '@duopoker/ui-kit';
import type { EquippedCosmetics, SessionState, SubscriptionTier } from '@duopoker/shared-types/index';
import { GHOST_BOARD_MIN_TIER, NEXT_HAND_DELAY_MS, defaultEquipped, gameChipId, tierMeetsRequirement } from '@duopoker/shared-types';
import { PokerTable3D, type TablePlayerVisual } from '../components/PokerTable3D';
import { GameTableShell } from '../components/table/GameTableShell';
import { TableTopHUD } from '../components/table/TableTopHUD';
import { TableActionDock } from '../components/table/TableActionDock';
import { JokerActionDock } from '../components/table/JokerActionDock';
import { HandResultOverlay } from '../components/table/HandResultOverlay';
import { VoiceChatPill } from '../components/table/VoiceChatPill';
import { GameEventFeed } from '../components/table/GameEventFeed';
import { BustedPlayerOverlay } from '../components/table/BustedPlayerOverlay';
import { useCommunityCardSounds, useTableGameFeed } from '../hooks/useTableGameFeed';
import { useTableSessionTick } from '../hooks/useTableSessionTick';
import { useAppStore } from '../store/useAppStore';
import { usesRealtimeSocket } from '../config/api';
import { rotatePlayersForHero } from '../lib/table-layout';

const maxRoundBet = (s: SessionState) =>
  s.players.reduce((m, p) => Math.max(m, s.playerRoundBet[p] ?? 0), 0);

const amountToCall = (s: SessionState, uid: string) =>
  Math.max(0, maxRoundBet(s) - (s.playerRoundBet[uid] ?? 0));

export const Table = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const session = useAppStore((s) => s.session);
  const sessionError = useAppStore((s) => s.sessionError);
  const userId = useAppStore((s) => s.userId);
  const playerAction = useAppStore((s) => s.playerAction);
  const connect = useAppStore((s) => s.connect);
  const socket = useAppStore((s) => s.socket);
  const joinSession = useAppStore((s) => s.joinSession);
  const pollSession = useAppStore((s) => s.pollSession);
  const stopPolling = useAppStore((s) => s.stopPolling);
  const leaveTable = useAppStore((s) => s.leaveTable);
  const clearTableSession = useAppStore((s) => s.clearTableSession);
  const tableVoluntaryLeave = useAppStore((s) => s.tableVoluntaryLeave);
  const mode = useAppStore((s) => s.mode);

  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const inventory = useAppStore((s) => s.inventory);
  const heroTableStatus = useAppStore((s) => s.tableStatus);

  const [playerProfiles, setPlayerProfiles] = useState<
    Record<
      string,
      {
        name: string;
        avatar?: string | null;
        tableStatus?: string | null;
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
              tableStatus?: string | null;
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
              tableStatus: p.tableStatus ?? null,
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
  const [jokerBid, setJokerBid] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [bustedDismissed, setBustedDismissed] = useState(false);
  const [ghostBoardVisible, setGhostBoardVisible] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !routeSessionId || tableVoluntaryLeave) return;
      connect();
      if (usesRealtimeSocket()) {
        useAppStore.getState().socket?.emit('reconnectSession', { sessionId: routeSessionId });
      } else {
        void useAppStore.getState().apiFetch(`/game/session/${encodeURIComponent(routeSessionId)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { session?: SessionState } | null) => {
            if (data?.session) useAppStore.setState({ session: data.session });
          })
          .catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [connect, routeSessionId, tableVoluntaryLeave]);

  const activeId = useMemo(() => {
    if (!session || session.players.length === 0) return undefined;
    return session.players[session.activePlayerIndex];
  }, [session]);

  const label = (uid: string) => playerProfiles[uid]?.name ?? uid.slice(0, 8);

  const feedEvents = useTableGameFeed(session, label, t, soundOn);
  useCommunityCardSounds(session?.communityCards?.length ?? 0, soundOn);

  const sid = session?.sessionId;
  const matchRoute = sid && routeSessionId && sid === routeSessionId;
  useTableSessionTick(matchRoute ? session : undefined, routeSessionId);

  const tablePlayers = useMemo((): TablePlayerVisual[] => {
    if (!session) return [];
    const dealerUid = session.players[session.dealerIndex];
    const visuals = session.players.map((uid) => {
      const profile = playerProfiles[uid];
      const hero = uid === userId;
      return {
        userId: uid,
        name: profile?.name ?? uid.slice(0, 8),
        stack: session.stacks[uid] ?? 0,
        roundBet: session.playerRoundBet[uid] ?? 0,
        isDealer: uid === dealerUid,
        avatar: profile?.avatar,
        tableStatus: hero ? heroTableStatus : profile?.tableStatus,
        tier: hero ? subscriptionTier : (profile?.subscriptionTier ?? 'FREE'),
        equipped: hero ? equipped : profile?.equipped,
        inventory: hero ? inventory : undefined,
        holeCards: session.playerCards[uid] ?? [],
        revealCards: hero,
        isActive: uid === activeId,
        isFolded: session.foldedPlayerIds.includes(uid)
      };
    });
    return rotatePlayersForHero(visuals, userId);
  }, [session, playerProfiles, userId, subscriptionTier, equipped, inventory, heroTableStatus, activeId]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!routeSessionId || tableVoluntaryLeave) return;
    if (usesRealtimeSocket()) {
      joinSession(routeSessionId, mode);
      socket?.emit('reconnectSession', { sessionId: routeSessionId });
      return;
    }
    void joinSession(routeSessionId, mode);
    pollSession(routeSessionId);
    return () => stopPolling();
  }, [routeSessionId, tableVoluntaryLeave, joinSession, pollSession, stopPolling, mode, socket]);

  useEffect(() => {
    if (session?.bigBlind) setRaiseAmount(session.bigBlind * 2);
  }, [session?.bigBlind, session?.handNumber]);

  useEffect(() => {
    if ((session?.stacks[userId] ?? 0) > 0) setBustedDismissed(false);
  }, [session?.stacks, userId, session?.handNumber]);

  useEffect(() => {
    setGhostBoardVisible(false);
  }, [session?.handNumber]);

  const exitToLobby = () => {
    clearTableSession();
    navigate('/lobby', { replace: true });
  };

  const handleLeaveTable = () => {
    const id = session?.sessionId ?? routeSessionId;
    if (leaving) return;
    setLeaving(true);
    clearTableSession();
    navigate('/lobby', { replace: true });
    if (id) {
      void leaveTable(id)
        .catch(() => undefined)
        .finally(() => setLeaving(false));
    } else {
      setLeaving(false);
    }
  };

  const sessionExitCodes = [
    'NOT_SEATED',
    'NOT_ASSIGNED',
    'join_failed',
    'SESSION_NOT_FOUND',
    'AUTH_REQUIRED'
  ];

  useEffect(() => {
    if (!sessionError || !routeSessionId) return;
    if (sessionExitCodes.includes(sessionError)) {
      exitToLobby();
    }
  }, [sessionError, routeSessionId]);

  useEffect(() => {
    if (tableVoluntaryLeave || (matchRoute && session)) return;
    const timer = window.setTimeout(() => exitToLobby(), 10_000);
    return () => window.clearTimeout(timer);
  }, [matchRoute, session, routeSessionId, tableVoluntaryLeave]);

  if (!routeSessionId) {
    return (
      <PageShell maxWidth="lg">
        <GlassPanel className="border-white/10 p-6 text-muted">{t('table.invalid')}</GlassPanel>
      </PageShell>
    );
  }

  if (tableVoluntaryLeave) {
    return <Navigate to="/lobby" replace />;
  }

  if (!matchRoute || !session) {
    return (
      <PageShell
        maxWidth="lg"
        back={
          <button type="button" className="premium-link text-sm" onClick={() => exitToLobby()}>
            {t('nav.backLobby')}
          </button>
        }
        eyebrow={t('table.connecting')}
        title={t('table.joiningTitle')}
      >
        <GlassPanel glow="gold" className="border-gold/15 p-6">
          <LoadingSkeleton lines={2} className="mb-4" />
          <p className="text-sm text-muted">{t('table.connectingTo', { id: routeSessionId })}</p>
          <p className="mt-2 text-xs text-subtle">{t('table.connectingHint')}</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => exitToLobby()}>
            {t('table.backToLobby')}
          </Button>
        </GlassPanel>
      </PageShell>
    );
  }

  const need = amountToCall(session, userId);
  const myTurn = activeId === userId && session.street !== 'LOBBY' && session.street !== 'COMPLETE';
  const secondsLeft =
    myTurn && session.actionDeadlineAt
      ? Math.max(0, Math.ceil((session.actionDeadlineAt - now) / 1000))
      : null;
  const nextHandMsLeft =
    session.street === 'COMPLETE'
      ? session.handCompletedAt
        ? Math.max(0, NEXT_HAND_DELAY_MS - (now - session.handCompletedAt))
        : 0
      : null;
  const nextHandSeconds =
    nextHandMsLeft !== null ? Math.max(0, Math.ceil(nextHandMsLeft / 1000)) : null;
  const playersWithStack = session.players.filter((id) => (session.stacks[id] ?? 0) > 0);
  const gameOver = session.street === 'COMPLETE' && playersWithStack.length < 2;
  const heroStack = session.stacks[userId] ?? 0;
  const heroBusted = session.players.includes(userId) && heroStack <= 0;
  const heroSpectating = heroBusted && playersWithStack.length >= 2;
  const showBustedOverlay = heroBusted && !bustedDismissed;
  const waitingForPlayers = session.street === 'LOBBY' && !showBustedOverlay;

  const kettle =
    session.pot +
    Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const minRaise = Math.max(
    session.bigBlind,
    session.currentBet > 0
      ? session.currentBet * 2 - (session.playerRoundBet[userId] ?? 0)
      : session.bigBlind
  );
  const maxRaise = heroStack;
  const halfPotRaise = Math.max(minRaise, Math.floor(kettle / 2));
  const potRaise = Math.max(minRaise, kettle);
  const holeCards = session.playerCards[userId] ?? [];
  const activeLabel = activeId
    ? `${label(activeId)}${activeId === userId ? ` ${t('table.you')}` : ''}`
    : '—';
  const winnerNames = (session.winners ?? []).map(label).join(', ') || '—';
  const isPreflopMuckWin =
    session.street === 'COMPLETE' &&
    session.mode === 'HOLDEM' &&
    (session.communityCards?.length ?? 0) === 0;
  const hasGhostBoard = (session.ghostCommunityCards?.length ?? 0) === 5;
  const canPeekGhostBoard =
    isPreflopMuckWin && hasGhostBoard && tierMeetsRequirement(subscriptionTier, GHOST_BOARD_MIN_TIER);
  const showGhostUpsell =
    isPreflopMuckWin && !tierMeetsRequirement(subscriptionTier, GHOST_BOARD_MIN_TIER);

  const handleRaise = () => {
    const amount = Math.min(maxRaise, Math.max(minRaise, raiseAmount || minRaise));
    playerAction({
      sessionId: sid,
      type: session.currentBet > 0 ? 'raise' : 'bet',
      amount
    });
  };

  return (
    <GameTableShell
      hud={
        <TableTopHUD
          mode={session.mode}
          pot={kettle}
          street={session.street}
          seatCount={session.players.length}
          smallBlind={session.smallBlind}
          bigBlind={session.bigBlind}
          handNumber={session.handNumber}
          chipId={gameChipId(equipped.chip)}
          onLeaveTable={() => void handleLeaveTable()}
          leaving={leaving}
        />
      }
      table={
        !waitingForPlayers && session.street ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="relative h-full min-h-0"
          >
            <PokerTable3D
              communityCards={
                session.mode === 'HOLDEM'
                  ? (session.communityCards ?? [])
                  : (session.communityCards ?? [])
              }
              ghostCommunityCards={
                ghostBoardVisible && canPeekGhostBoard ? (session.ghostCommunityCards ?? []) : []
              }
              pot={kettle}
              street={session.street === 'LOBBY' ? 'COMPLETE' : session.street}
              players={tablePlayers}
              heroDeckId={equipped.deck}
              heroChipId={equipped.chip}
              heroTableFeltId={equipped.table}
              className="h-full"
            />
            <HandResultOverlay
              visible={session.street === 'COMPLETE' && !showBustedOverlay}
              winners={winnerNames}
              gameOver={gameOver}
              nextHandSeconds={nextHandSeconds}
              canPeekGhostBoard={canPeekGhostBoard}
              ghostBoardVisible={ghostBoardVisible}
              onToggleGhostBoard={() => setGhostBoardVisible((v) => !v)}
              showGhostUpsell={showGhostUpsell}
            />
            <BustedPlayerOverlay
              visible={showBustedOverlay}
              leaving={leaving}
              onWatch={() => setBustedDismissed(true)}
              onLeave={() => void handleLeaveTable()}
            />
            <div className="pointer-events-auto absolute left-3 top-16 z-20 sm:left-4 sm:top-[4.5rem]">
              <GameEventFeed events={feedEvents} title={t('table.feedTitle')} />
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 border-white/10 text-[10px] uppercase tracking-wider"
                onClick={() => setSoundOn((v) => !v)}
              >
                {soundOn ? t('table.soundOn') : t('table.soundOff')}
              </Button>
            </div>
            <VoiceChatPill />
          </motion.div>
        ) : (
          <div className="flex h-full items-center justify-center px-6">
            <GlassPanel glow="gold" className="max-w-md border-gold/15 p-6 text-center">
              <p className="font-display text-lg text-ivory">{t('table.waitingOpponent')}</p>
            </GlassPanel>
          </div>
        )
      }
      dock={
        session.mode === 'JOKER' && session.joker ? (
          <JokerActionDock
            myTurn={myTurn}
            street={session.street}
            holeCards={holeCards}
            deckId={equipped.deck}
            joker={session.joker}
            bidAmount={jokerBid}
            maxBid={Math.min(9, session.joker.cardsThisDeal)}
            onBidAmountChange={setJokerBid}
            secondsLeft={secondsLeft}
            activeLabel={activeLabel}
            isHeroActive={activeId === userId}
            sessionError={sessionError}
            onBid={() => playerAction({ sessionId: sid, type: 'bid', amount: jokerBid })}
            onPlayCard={(card) => playerAction({ sessionId: sid, type: 'playCard', card })}
          />
        ) : (
          <TableActionDock
            myTurn={myTurn}
            need={need}
            currentBet={session.currentBet}
            minRaise={minRaise}
            maxRaise={maxRaise}
            raiseAmount={raiseAmount}
            onRaiseAmountChange={setRaiseAmount}
            halfPotRaise={halfPotRaise}
            potRaise={potRaise}
            kettle={kettle}
            secondsLeft={secondsLeft}
            holeCards={holeCards}
            deckId={equipped.deck}
            activeLabel={activeLabel}
            isHeroActive={activeId === userId}
            heroSpectating={heroSpectating}
            street={session.street}
            sessionError={sessionError}
            onFold={() => playerAction({ sessionId: sid, type: 'fold' })}
            onCheck={() => playerAction({ sessionId: sid, type: 'check' })}
            onCall={() => playerAction({ sessionId: sid, type: 'call' })}
            onRaise={handleRaise}
          />
        )
      }
    />
  );
};
