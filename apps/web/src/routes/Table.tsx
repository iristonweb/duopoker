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
import { formatJokerPlayLine } from '../lib/joker-declaration-label';
import { holdemShowdownHandLines } from '../lib/holdem-hand-rank';
import { holdemSidePotAmounts, holdemSidePotSummary } from '../lib/holdem-side-pots';
import { PwaInstallHint } from '../components/PwaInstallHint';
import { TuzovanieTableOverlay } from '../components/table/TuzovanieTableOverlay';
import { TableLeaderboardPanel } from '../components/table/TableLeaderboardPanel';
import { buildTableLeaderboard, leaderboardLeaders } from '@duopoker/table-client';

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
  const minimizeTable = useAppStore((s) => s.minimizeTable);
  const resumeTable = useAppStore((s) => s.resumeTable);
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
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

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
          const card = action.card ? formatCardLabel(action.card, t) : '?';
          const cardLine = action.declaration
            ? formatJokerPlayLine(card, action.declaration, t)
            : card;
          return t('table.feedJokerPlay', { name, card: cardLine });
        }
        default:
          return `${name}: ${action.type}`;
      }
    },
    [label, t]
  );

  const viewSession = useTableDisplayState(session, userId, formatDisplayAction, reduceMotion) ?? session;

  const { events: feedEvents, pulseKey: feedPulseKey } = useTableGameFeed(viewSession, label, t, soundOn, {
    actionSounds: false,
    handSounds: false,
    streetSounds: false
  });
  const { seatBubbles, chipFlights, jokerFlights, potPulseKey, foldingUsers, checkRippleUsers } =
    useTableAnimationQueue(session, userId, label, t, soundOn, reduceMotion);
  useCommunityCardSounds(viewSession?.communityCards?.length ?? 0, false);
  useTableMusic(musicOn);

  const sid = session?.sessionId;
  const matchRoute = sid && routeSessionId && sid === routeSessionId;
  useTableSessionTick(matchRoute ? session : undefined, routeSessionId);

  const tablePlayers = useMemo((): TablePlayerVisual[] => {
    if (!viewSession || !session) return [];
    const dealerUid = viewSession.players[viewSession.dealerIndex];
    const visualActiveId =
      session.players.length > 0 ? session.players[session.activePlayerIndex] : undefined;
    const atShowdown = viewSession.street === 'SHOWDOWN' || viewSession.street === 'COMPLETE';
    const inHandStreet = viewSession.street && viewSession.street !== 'LOBBY';
    const visuals = viewSession.players.map((uid) => {
      const profile = playerProfiles[uid];
      const hero = uid === userId;
      const viewCards = viewSession.playerCards[uid] ?? [];
      const realCards = session.playerCards[uid] ?? [];
      const folded = viewSession.foldedPlayerIds.includes(uid);
      const inHand = inHandStreet && !folded;
      const dealingHidden = viewCards.filter((c) => String(c).startsWith('__')).length;
      const hiddenCardCount =
        dealingHidden > 0
          ? dealingHidden
          : !hero && inHand && !atShowdown && viewSession.mode !== 'JOKER'
            ? realCards.length || 2
            : 0;
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
        holeCards:
          viewSession.mode === 'JOKER' && hero
            ? []
            : hero
              ? viewCards.filter((c) => !String(c).startsWith('__'))
              : atShowdown && !folded
                ? realCards
                : [],
        hiddenCardCount,
        revealCards:
          viewSession.mode === 'JOKER'
            ? false
            : hero || (atShowdown && !folded && realCards.length > 0),
        isActive: uid === visualActiveId,
        isFolded: folded,
        isAllIn: session.allInPlayerIds?.includes(uid) ?? false,
        isHero: hero,
        tricksWon:
          viewSession.mode === 'JOKER' &&
          viewSession.joker &&
          (viewSession.street === 'TRICKS' || viewSession.street === 'BIDDING')
            ? (viewSession.joker.tricksWon[uid] ?? 0)
            : undefined
      };
    });
    return rotatePlayersForHero(visuals, userId);
  }, [
    viewSession,
    session,
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
    resumeTable();
    if (usesRealtimeSocket()) {
      joinSession(routeSessionId, mode);
      socket?.emit('reconnectSession', { sessionId: routeSessionId });
      return;
    }
    void joinSession(routeSessionId, mode);
    pollSession(routeSessionId);
    return () => {
      if (!useAppStore.getState().tableMinimized) stopPolling();
    };
  }, [routeSessionId, tableVoluntaryLeave, joinSession, pollSession, stopPolling, mode, socket, resumeTable]);

  const raiseBounds = useMemo(() => {
    if (!session || session.mode === 'JOKER' || !userId) {
      return { minTotal: 0, maxTotal: 0, canRaise: false, need: 0, roundBet: 0 };
    }
    const roundBet = session.playerRoundBet[userId] ?? 0;
    const need = amountToCall(session, userId);
    const heroStack = session.stacks[userId] ?? 0;
    const minIncrement = session.bigBlind;
    const minTotal =
      need > 0
        ? roundBet + need + minIncrement
        : Math.max(session.bigBlind, roundBet + minIncrement);
    const maxTotal = roundBet + heroStack;
    return { minTotal, maxTotal, canRaise: minTotal <= maxTotal, need, roundBet };
  }, [session, userId]);

  useEffect(() => {
    if (!session || session.mode === 'JOKER') return;
    setRaiseAmount((v) =>
      Math.min(raiseBounds.maxTotal, Math.max(raiseBounds.minTotal, v || raiseBounds.minTotal))
    );
  }, [session?.handNumber, session?.street, raiseBounds.minTotal, raiseBounds.maxTotal, session?.mode]);

  useEffect(() => {
    if (session?.mode === 'JOKER') setJokerBid(0);
  }, [session?.mode, session?.handNumber, session?.joker?.matchHandIndex]);

  useEffect(() => {
    if (session?.mode !== 'JOKER' && (session?.stacks[userId] ?? 0) > 0) {
      setBustedDismissed(false);
    }
  }, [session?.mode, session?.stacks, userId]);

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

  const handleMinimizeTable = () => {
    minimizeTable();
    navigate('/lobby');
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

  const leaderboardEntries = session ? buildTableLeaderboard(session) : [];
  const leaderboardProfiles = Object.fromEntries(
    Object.entries(playerProfiles).map(([uid, p]) => [
      uid,
      {
        name: p.name,
        avatar: p.avatar,
        subscriptionTier: p.subscriptionTier,
        equipped: p.equipped
      }
    ])
  );
  const matchLeaderNames = session
    ? leaderboardLeaders(session)
        .map(label)
        .join(', ')
    : '';

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
  const { minTotal, maxTotal, canRaise, roundBet } = raiseBounds;
  const halfPotRaise = Math.max(
    minTotal,
    need > 0 ? roundBet + need + Math.floor(kettle / 2) : roundBet + Math.floor(kettle / 2)
  );
  const potRaise = Math.max(
    minTotal,
    need > 0 ? roundBet + need + kettle : roundBet + kettle
  );
  const holeCards = session.playerCards[userId] ?? [];
  const viewKettle =
    tableView.pot +
    Object.values(tableView.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  const jokerBoardCards =
    tableView.mode !== 'JOKER'
      ? (tableView.communityCards ?? [])
      : tableView.street === 'TRICKS' && tableView.joker
        ? tableView.joker.currentTrick.map((p) => p.card)
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
  const lastActionText = useMemo(() => {
    const log = session?.actionLog;
    if (!log?.length) return undefined;
    return formatDisplayAction(log[log.length - 1]);
  }, [session?.actionLog, formatDisplayAction]);
  const winnerNames = (tableView.winners ?? []).map(label).join(', ') || '—';
  const holdemPayoutSummary =
    !isJoker && tableView.winnersShare
      ? (tableView.winners ?? [])
          .map((uid) =>
            t('table.feedWinnerShare', { name: label(uid), amount: tableView.winnersShare![uid] ?? 0 })
          )
          .join(' · ')
      : undefined;
  const isPreflopMuckWin =
    session.street === 'COMPLETE' &&
    session.mode === 'HOLDEM' &&
    (session.communityCards?.length ?? 0) === 0;
  const holdemHandRankLine = useMemo(
    () => (isPreflopMuckWin ? undefined : holdemShowdownHandLines(tableView, label, t)),
    [isPreflopMuckWin, tableView, label, t]
  );
  const holdemSidePotLine = useMemo(
    () => holdemSidePotSummary(tableView, t),
    [tableView, t]
  );
  const holdemSidePotList = useMemo(() => holdemSidePotAmounts(tableView), [tableView]);
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
  const hasGhostBoard = (session.ghostCommunityCards?.length ?? 0) === 5;
  const canPeekGhostBoard =
    isPreflopMuckWin && hasGhostBoard && tierMeetsRequirement(subscriptionTier, GHOST_BOARD_MIN_TIER);
  const showGhostUpsell =
    isPreflopMuckWin && !tierMeetsRequirement(subscriptionTier, GHOST_BOARD_MIN_TIER);

  const handleRaise = () => {
    if (!canRaise) return;
    const total = Math.min(maxTotal, Math.max(minTotal, raiseAmount || minTotal));
    const increment = total - roundBet - need;
    playerAction({
      sessionId: sid,
      type: session.currentBet > 0 ? 'raise' : 'bet',
      amount: increment
    });
  };

  return (
    <>
    <GameTableShell
      overlay={<PwaInstallHint />}
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
          jokerRules={session.jokerRules}
          onLeaveTable={() => void handleLeaveTable()}
          onMinimizeTable={handleMinimizeTable}
          leaving={leaving}
          leaderboardEntries={leaderboardEntries}
          leaderboardProfiles={leaderboardProfiles}
          heroId={userId}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
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
            <TuzovanieTableOverlay
              session={tableView}
              heroId={userId}
              deckId={equipped.deck}
              label={label}
              t={t}
              reduceMotion={reduceMotion ?? false}
            />
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
              sidePots={holdemSidePotList}
              foldingUsers={foldingUsers}
              checkRippleUsers={checkRippleUsers}
              className="h-full"
            />
            <HandResultOverlay
              visible={tableView.street === 'COMPLETE' && !showBustedOverlay}
              winners={isJoker || holdemPayoutSummary ? undefined : winnerNames}
              summaryText={
                isJoker && jokerHandSummary
                  ? t('table.jokerHandSummary', { summary: jokerHandSummary })
                  : holdemPayoutSummary ?? undefined
              }
              handRankLine={holdemHandRankLine}
              sidePotLine={holdemSidePotLine}
              gameOver={gameOver}
              gameOverMessage={
                jokerMatchOver
                  ? t('table.jokerMatchLeader', { names: matchLeaderNames || '—' })
                  : gameOver
                    ? t('table.holdemLeader', { names: matchLeaderNames || winnerNames || '—' })
                    : undefined
              }
              nextHandSeconds={jokerMatchOver ? null : nextHandSeconds}
              canPeekGhostBoard={canPeekGhostBoard}
              ghostBoardVisible={ghostBoardVisible}
              onToggleGhostBoard={() => setGhostBoardVisible((v) => !v)}
              showGhostUpsell={showGhostUpsell}
              leaderboardEntries={gameOver ? leaderboardEntries : undefined}
              leaderboardProfiles={gameOver ? leaderboardProfiles : undefined}
              heroId={userId}
              mode={tableView.mode}
              buyIn={session.buyIn}
            />
            <TableLeaderboardPanel
              entries={leaderboardEntries}
              mode={tableView.mode}
              heroId={userId}
              profiles={leaderboardProfiles}
              open={leaderboardOpen}
              onOpenChange={setLeaderboardOpen}
              buyIn={session.buyIn}
            />
            <BustedPlayerOverlay
              visible={showBustedOverlay}
              leaving={leaving}
              onWatch={() => setBustedDismissed(true)}
              onLeave={() => void handleLeaveTable()}
            />
            <GameStoryPanel
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
                poolPremiumLabel={t('table.notebookPoolPremium')}
                liveLabel={t('table.notebookLive')}
                modeLabel={t('table.joker')}
              />
            ) : null}
            <VoiceChatPill />
            {waitingForPlayers ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
                <GlassPanel glow="emerald" className="pointer-events-auto max-w-md border-emerald/20 p-8 text-center shadow-[0_0_48px_rgba(74,222,128,0.15)]">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald/40 bg-emerald/10 text-xl"
                  >
                    ♠
                  </motion.div>
                  <p className="font-display text-xl text-gradient-gold">
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
            userId={userId}
            dealerId={session.players[session.dealerIndex]!}
            playerIds={session.players}
            onBidAmountChange={setJokerBid}
            secondsLeft={secondsLeft}
            activeLabel={activeLabel}
            isHeroActive={activeId === userId}
            lastActionText={lastActionText}
            sessionError={sessionError}
            actionLogLen={session.actionLog?.length ?? 0}
            strictJoker={session.jokerRules?.strictJoker}
            onBid={() => {
              const max = Math.min(9, session.joker!.cardsThisDeal);
              const bid = Math.min(max, Math.max(0, jokerBid));
              playerAction({ sessionId: sid, type: 'bid', amount: bid });
            }}
            onPlayCard={(card, declaration) =>
              playerAction({ sessionId: sid, type: 'playCard', card, declaration })
            }
            onChooseTrump={(trumpSuit) =>
              playerAction({ sessionId: sid, type: 'chooseTrump', trumpSuit })
            }
          />
        ) : (
          <TableActionDock
            myTurn={myTurn}
            need={need}
            currentBet={session.currentBet}
            minTotal={minTotal}
            maxTotal={maxTotal}
            canRaise={canRaise}
            raiseAmount={raiseAmount}
            onRaiseAmountChange={setRaiseAmount}
            halfPotRaise={Math.min(maxTotal, halfPotRaise)}
            potRaise={Math.min(maxTotal, potRaise)}
            kettle={kettle}
            secondsLeft={secondsLeft}
            holeCards={holeCards}
            deckId={equipped.deck}
            activeLabel={activeLabel}
            isHeroActive={activeId === userId}
            lastActionText={lastActionText}
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
    </>
  );
};
