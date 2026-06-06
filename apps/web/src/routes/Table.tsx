import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, GlassPanel, LoadingSkeleton, PageShell } from '@duopoker/ui-kit';
import type { EquippedCosmetics, PlayerAction, SessionState, SubscriptionTier } from '@duopoker/shared-types/index';
import { GHOST_BOARD_MIN_TIER, JOKER_TOTAL_HANDS, NEXT_HAND_DELAY_MS, defaultEquipped, gameChipId, tierMeetsRequirement } from '@duopoker/shared-types';
import { PokerTable3D, type TablePlayerVisual } from '../components/PokerTable3D';
import { GameTableShell } from '../components/table/GameTableShell';
import { TableTopHUD } from '../components/table/TableTopHUD';
import { TableActionDock } from '../components/table/TableActionDock';
import { JokerActionDock } from '../components/table/JokerActionDock';
import { HandResultOverlay } from '../components/table/HandResultOverlay';
import { VoiceChatPill } from '../components/table/VoiceChatPill';
import { GameStoryPanel } from '../components/table/GameStoryPanel';
import { JokerNotebookPanel } from '../components/table/JokerNotebookPanel';
import { BustedPlayerOverlay } from '../components/table/BustedPlayerOverlay';
import { useCommunityCardSounds, useTableGameFeed } from '../hooks/useTableGameFeed';
import { useTableAnimationQueue } from '../hooks/useTableAnimationQueue';
import { useTableDisplayState } from '../hooks/useTableDisplayState';
import { useTableSessionTick } from '../hooks/useTableSessionTick';
import { loadTableMusicPref, loadTableSfxPref, saveTableSfxPref, useTableMusic } from '../hooks/useTableMusic';
import { saveTableMusicPref } from '../lib/table-music';
import { useAppStore } from '../store/useAppStore';
import { usesRealtimeSocket } from '../config/api';
import { rotatePlayersForHero } from '../lib/table-layout';
import { formatCardLabel } from '../lib/joker-labels';

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
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const displayName = useAppStore((s) => s.displayName);
  const nickname = useAppStore((s) => s.nickname);

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
    if (!userId) return;
    const heroName = nickname ? `@${nickname}` : (displayName || userId.slice(0, 8));
    setPlayerProfiles((prev) => ({
      ...prev,
      [userId]: {
        name: heroName,
        avatar: avatarUrl,
        tableStatus: heroTableStatus,
        subscriptionTier,
        equipped
      }
    }));
  }, [userId, nickname, displayName, avatarUrl, heroTableStatus, subscriptionTier, equipped]);

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
          setPlayerProfiles((prev) => {
            const map = { ...prev };
            for (const p of data.players!) {
              if (p.userId === userId) continue;
              map[p.userId] = {
                name: p.nickname ? `@${p.nickname}` : p.displayName,
                avatar: p.avatar,
                tableStatus: p.tableStatus ?? null,
                subscriptionTier: p.subscriptionTier ?? 'FREE',
                equipped: p.equipped ?? defaultEquipped()
              };
            }
            return map;
          });
        }
      )
      .catch(() => undefined);
  }, [routeSessionId, session?.players?.length, session?.handNumber, userId]);

  const [raiseAmount, setRaiseAmount] = useState(0);
  const [jokerBid, setJokerBid] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(() => loadTableSfxPref());
  const [musicOn, setMusicOn] = useState(() => loadTableMusicPref());
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

  const label = useCallback(
    (uid: string) => playerProfiles[uid]?.name ?? uid.slice(0, 8),
    [playerProfiles]
  );

  const reduceMotion = useReducedMotion() ?? false;

  const formatDisplayAction = useCallback(
    (action: PlayerAction) => {
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
    },
    [label, t]
  );

  const viewSession = useTableDisplayState(session, userId, formatDisplayAction, reduceMotion) ?? session;

  const { events: feedEvents, pulseKey: feedPulseKey } = useTableGameFeed(viewSession, label, t, soundOn, {
    actionSounds: false
  });
  const { seatBubbles, chipFlights, jokerFlights, potPulseKey, dealTick } = useTableAnimationQueue(
    viewSession,
    label,
    t,
    soundOn,
    reduceMotion
  );
  useCommunityCardSounds(viewSession?.communityCards?.length ?? 0, false);
  useTableMusic(musicOn);

  const sid = session?.sessionId;
  const matchRoute = sid && routeSessionId && sid === routeSessionId;
  useTableSessionTick(matchRoute ? session : undefined, routeSessionId);

  const tablePlayers = useMemo((): TablePlayerVisual[] => {
    if (!viewSession) return [];
    const dealerUid = viewSession.players[viewSession.dealerIndex];
    const visualActiveId =
      viewSession.players.length > 0 ? viewSession.players[viewSession.activePlayerIndex] : undefined;
    const atShowdown = viewSession.street === 'SHOWDOWN' || viewSession.street === 'COMPLETE';
    const inHandStreet = viewSession.street && viewSession.street !== 'LOBBY';
    const visuals = viewSession.players.map((uid) => {
      const profile = playerProfiles[uid];
      const hero = uid === userId;
      const rawCards = viewSession.playerCards[uid] ?? [];
      const folded = viewSession.foldedPlayerIds.includes(uid);
      const inHand = inHandStreet && !folded;
      const showHiddenBacks = !hero && inHand && rawCards.length === 0 && viewSession.mode !== 'JOKER';
      return {
        userId: uid,
        name: profile?.name ?? uid.slice(0, 8),
        stack:
          viewSession.mode === 'JOKER'
            ? (viewSession.joker?.scores[uid] ?? 0)
            : (viewSession.stacks[uid] ?? 0),
        roundBet: viewSession.playerRoundBet[uid] ?? 0,
        isDealer: uid === dealerUid,
        avatar: hero ? (avatarUrl ?? profile?.avatar) : profile?.avatar,
        tableStatus: hero ? heroTableStatus : profile?.tableStatus,
        tier: hero ? subscriptionTier : (profile?.subscriptionTier ?? 'FREE'),
        equipped: hero ? equipped : profile?.equipped,
        inventory: hero ? inventory : undefined,
        holeCards: viewSession.mode === 'JOKER' && hero ? [] : rawCards,
        hiddenCardCount: showHiddenBacks ? 2 : 0,
        revealCards:
          viewSession.mode === 'JOKER' ? false : hero || (atShowdown && !folded && rawCards.length > 0),
        isActive: uid === visualActiveId,
        isFolded: folded,
        isHero: hero
      };
    });
    return rotatePlayersForHero(visuals, userId);
  }, [
    viewSession,
    playerProfiles,
    userId,
    subscriptionTier,
    equipped,
    inventory,
    heroTableStatus,
    avatarUrl
  ]);

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
    if (session?.mode === 'JOKER') {
      setJokerBid(0);
      return;
    }
    if ((session?.stacks[userId] ?? 0) > 0) setBustedDismissed(false);
  }, [session?.mode, session?.stacks, userId, session?.handNumber, session?.joker?.cardsThisDeal]);

  useEffect(() => {
    setGhostBoardVisible(false);
  }, [session?.handNumber]);

  const exitToLobby = () => {
    clearTableSession();
    navigate('/lobby', { replace: true });
  };

  useEffect(() => {
    if (!tableVoluntaryLeave) return;
    navigate('/lobby', { replace: true });
  }, [tableVoluntaryLeave, navigate]);

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
    return null;
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

  const tableView = viewSession ?? session;

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
  const isJoker = session.mode === 'JOKER';
  const playersWithStack = session.players.filter((id) => (session.stacks[id] ?? 0) > 0);
  const jokerMatchOver =
    isJoker &&
    session.street === 'COMPLETE' &&
    (session.joker?.matchHandIndex ?? 0) >= JOKER_TOTAL_HANDS - 1;
  const gameOver = isJoker
    ? jokerMatchOver
    : session.street === 'COMPLETE' && playersWithStack.length < 2;
  const heroStack = session.stacks[userId] ?? 0;
  const heroBusted = !isJoker && session.players.includes(userId) && heroStack <= 0;
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
  const viewKettle =
    tableView.pot +
    Object.values(tableView.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  const jokerBoardCards =
    tableView.mode !== 'JOKER'
      ? (tableView.communityCards ?? [])
      : tableView.street === 'TRICKS' && tableView.joker
        ? tableView.joker.currentTrick.map((p) => p.card)
        : tableView.street === 'BIDDING'
          ? (tableView.communityCards ?? [])
          : [];
  const jokerBoardKeys =
    tableView.mode === 'JOKER' && tableView.street === 'TRICKS' && tableView.joker
      ? tableView.joker.currentTrick.map(
          (p, i) => `h${tableView.handNumber}-trick-${tableView.joker!.trickNumber}-${p.userId}-${i}`
        )
      : tableView.mode !== 'JOKER'
        ? (tableView.communityCards ?? []).map((c, i) => `h${tableView.handNumber}-board-${c}-${i}`)
        : undefined;
  const activeLabel = activeId
    ? `${label(activeId)}${activeId === userId ? ` ${t('table.you')}` : ''}`
    : '—';
  const winnerNames = (tableView.winners ?? []).map(label).join(', ') || '—';
  const jokerHandSummary =
    isJoker && session.joker?.handPoints
      ? session.players
          .map((p) => {
            const pts = session.joker!.handPoints![p];
            if (pts === undefined) return null;
            return t('table.feedJokerScoreLine', { name: label(p), pts });
          })
          .filter(Boolean)
          .join(' · ')
      : undefined;
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
          mode={tableView.mode}
          pot={viewKettle}
          street={tableView.street}
          seatCount={tableView.players.length}
          smallBlind={tableView.smallBlind}
          bigBlind={tableView.bigBlind}
          handNumber={tableView.handNumber}
          chipId={gameChipId(equipped.chip)}
          joker={tableView.mode === 'JOKER' ? tableView.joker : null}
          onLeaveTable={() => void handleLeaveTable()}
          leaving={leaving}
        />
      }
      table={
        session.street ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="relative h-full min-h-0"
          >
            <PokerTable3D
              communityCards={jokerBoardCards}
              boardCardKeys={jokerBoardKeys}
              handNumber={tableView.handNumber}
              showBoardSlots={tableView.mode !== 'JOKER'}
              ghostCommunityCards={
                ghostBoardVisible && canPeekGhostBoard ? (tableView.ghostCommunityCards ?? []) : []
              }
              pot={viewKettle}
              street={tableView.street === 'LOBBY' ? 'COMPLETE' : tableView.street}
              players={tablePlayers}
              heroDeckId={equipped.deck}
              heroChipId={equipped.chip}
              heroTableFeltId={equipped.table}
              seatBubbles={seatBubbles}
              chipFlights={chipFlights}
              jokerFlights={jokerFlights}
              potPulseKey={potPulseKey}
              dealTick={dealTick}
              className="h-full"
            />
            <HandResultOverlay
              visible={tableView.street === 'COMPLETE' && !showBustedOverlay}
              winners={isJoker ? undefined : winnerNames}
              summaryText={
                isJoker && jokerHandSummary
                  ? t('table.jokerHandSummary', { summary: jokerHandSummary })
                  : undefined
              }
              gameOver={gameOver}
              gameOverMessage={jokerMatchOver ? t('table.jokerMatchOver') : undefined}
              nextHandSeconds={jokerMatchOver ? null : nextHandSeconds}
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
            <GameStoryPanel
              className="pointer-events-auto absolute left-3 top-16 z-20 sm:left-4 sm:top-[4.5rem]"
              events={feedEvents}
              pulseKey={feedPulseKey}
              soundOn={soundOn}
              musicOn={musicOn}
              onSoundToggle={() =>
                setSoundOn((v) => {
                  saveTableSfxPref(!v);
                  return !v;
                })
              }
              onMusicToggle={() =>
                setMusicOn((v) => {
                  saveTableMusicPref(!v);
                  return !v;
                })
              }
              soundOnLabel={t('table.soundOn')}
              soundOffLabel={t('table.soundOff')}
              musicOnLabel={t('table.musicOn')}
              musicOffLabel={t('table.musicOff')}
              title={t('table.feedTitle')}
              openLabel={t('table.feedOpenHistory')}
              closeLabel={t('table.feedCloseHistory')}
              emptyLabel={t('table.feedEmpty')}
            />
            {session.mode === 'JOKER' && session.joker ? (
              <JokerNotebookPanel
                className="pointer-events-auto absolute right-3 top-16 z-20 sm:right-4 sm:top-[4.5rem]"
                joker={session.joker}
                players={session.players}
                label={label}
                title={t('table.notebookTitle')}
                openLabel={t('table.notebookOpen')}
                closeLabel={t('table.notebookClose')}
                dealLabel={t('table.notebookDeal')}
                bidLabel={t('table.notebookBid')}
                tricksLabel={t('table.notebookTricks')}
                pointsLabel={t('table.notebookPoints')}
                totalLabel={t('table.notebookTotal')}
                liveLabel={t('table.notebookLive')}
              />
            ) : null}
            <VoiceChatPill />
            {waitingForPlayers ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/45 px-6 backdrop-blur-[2px]">
                <GlassPanel glow="gold" className="pointer-events-auto max-w-md border-gold/15 p-6 text-center">
                  <p className="font-display text-lg text-ivory">
                    {isJoker ? t('table.waitingForPlayersJoker') : t('table.waitingOpponent')}
                  </p>
                </GlassPanel>
              </div>
            ) : null}
          </motion.div>
        ) : null
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
            actionLogLen={session.actionLog?.length ?? 0}
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
