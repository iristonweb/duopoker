import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Card, EquippedCosmetics, PlayerAction, SubscriptionTier } from '@duopoker/shared-types/index';
import {
  GHOST_BOARD_MIN_TIER,
  JOKER_TOTAL_HANDS,
  NEXT_HAND_DELAY_MS,
  defaultEquipped,
  gameChipId,
  tierMeetsRequirement
} from '@duopoker/shared-types';
import {
  amountToCall,
  buildTableLeaderboard,
  computeRaiseBounds,
  formatCardLabel,
  formatJokerPlayLine,
  formatTableError,
  halfPotRaise,
  holdemShowdownHandLines,
  holdemSidePotAmounts,
  holdemSidePotSummary,
  leaderboardLeaders,
  potSizedRaise,
  rotatePlayersForHero,
  sessionKettle,
  useCommunityCardSounds,
  useTableAnimationQueue,
  useTableDisplayState,
  useTableGameFeed,
  useTableSessionTick
} from '@duopoker/table-client';
import { colors } from '@duopoker/shared-types';
import { apiFetch } from '../lib/api';
import { useMobileStore } from '../state/useMobileStore';
import { useTableStore, usesRealtimeSocket } from '../state/useTableStore';
import { cleanupTableConnection } from '../lib/table-connection';
import { mobileTheme } from '../theme';
import { useReduceMotion } from './hooks/useReduceMotion';
import { loadTableMusicPref, loadTableSfxPref, saveTableMusicPref, saveTableSfxPref } from './lib/table-prefs';
import {
  BustedPlayerOverlay,
  GameStoryPanel,
  GameTableShell,
  HandResultOverlay,
  JokerActionDock,
  JokerNotebookPanel,
  PokerTableSurface,
  TableActionDock,
  TableLeaderboardPanel,
  TableTopHUD,
  TuzovanieTableOverlay,
  playTableSound,
  setTableMusicEnabled,
  tableHaptic,
  type TablePlayerVisual,
  type TableSoundKind
} from './index';

type ProfileMap = Record<
  string,
  {
    name: string;
    avatar?: string | null;
    tableStatus?: string | null;
    subscriptionTier: SubscriptionTier;
    equipped: EquippedCosmetics;
  }
>;

const SESSION_EXIT_CODES = [
  'NOT_SEATED',
  'NOT_ASSIGNED',
  'join_failed',
  'SESSION_NOT_FOUND',
  'AUTH_REQUIRED'
];

export function TableScreen({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation();
  const accessToken = useMobileStore((s) => s.accessToken);
  const userId = useMobileStore((s) => s.userId);
  const user = useMobileStore((s) => s.user);

  const session = useTableStore((s) => s.session);
  const sessionError = useTableStore((s) => s.sessionError);
  const tableVoluntaryLeave = useTableStore((s) => s.tableVoluntaryLeave);
  const joinSession = useTableStore((s) => s.joinSession);
  const pollSession = useTableStore((s) => s.pollSession);
  const stopPolling = useTableStore((s) => s.stopPolling);
  const connect = useTableStore((s) => s.connect);
  const playerAction = useTableStore((s) => s.playerAction);
  const leaveTable = useTableStore((s) => s.leaveTable);
  const clearTableSession = useTableStore((s) => s.clearTableSession);
  const reconnectSession = useTableStore((s) => s.reconnectSession);

  const [playerProfiles, setPlayerProfiles] = useState<ProfileMap>({});
  const [equipped, setEquipped] = useState<EquippedCosmetics>(defaultEquipped());
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('FREE');
  const [inventory, setInventory] = useState<string[]>([]);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [jokerBid, setJokerBid] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);
  const [bustedDismissed, setBustedDismissed] = useState(false);
  const [ghostBoardVisible, setGhostBoardVisible] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    void loadTableSfxPref().then(setSoundOn);
    void loadTableMusicPref().then(setMusicOn);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setTableMusicEnabled(musicOn);
  }, [musicOn]);

  useEffect(() => {
    if (!accessToken) return;
    void apiFetch('/profile', {}, accessToken)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            equipped?: EquippedCosmetics;
            subscriptionTier?: SubscriptionTier;
            inventory?: string[];
            avatar?: string | null;
            tableStatus?: string | null;
          } | null
        ) => {
          if (!data) return;
          if (data.equipped) setEquipped(data.equipped);
          if (data.subscriptionTier) setSubscriptionTier(data.subscriptionTier);
          if (data.inventory) setInventory(data.inventory);
        }
      )
      .catch(() => undefined);
  }, [accessToken]);

  useEffect(() => {
    if (!userId || !user) return;
    const heroName = user.nickname ? `@${user.nickname}` : user.displayName;
    setPlayerProfiles((prev) => ({
      ...prev,
      [userId]: {
        name: heroName,
        avatar: null,
        tableStatus: null,
        subscriptionTier,
        equipped
      }
    }));
  }, [userId, user, subscriptionTier, equipped]);

  useEffect(() => {
    if (!sessionId || !session?.players?.length || !accessToken) return;
    void apiFetch(`/game/session/${encodeURIComponent(sessionId)}/players`, {}, accessToken)
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
  }, [sessionId, session?.players?.length, session?.handNumber, userId, accessToken]);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (!sessionId || tableVoluntaryLeave) return;
    void joinSession(sessionId);
    if (usesRealtimeSocket()) {
      reconnectSession(sessionId);
    } else {
      pollSession(sessionId);
    }
    return () => {
      stopPolling();
    };
  }, [sessionId, tableVoluntaryLeave, joinSession, pollSession, stopPolling, reconnectSession]);

  useEffect(() => () => cleanupTableConnection(), []);

  useEffect(() => {
    if (tableVoluntaryLeave || session?.sessionId === sessionId) return;
    const timer = setTimeout(() => {
      clearTableSession();
      router.replace('/lobby');
    }, 10_000);
    return () => clearTimeout(timer);
  }, [session?.sessionId, sessionId, tableVoluntaryLeave, clearTableSession]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !sessionId || tableVoluntaryLeave) return;
      connect();
      reconnectSession(sessionId);
    });
    return () => sub.remove();
  }, [connect, sessionId, tableVoluntaryLeave, reconnectSession]);

  useEffect(() => {
    if (!tableVoluntaryLeave) return;
    router.replace('/lobby');
  }, [tableVoluntaryLeave]);

  useEffect(() => {
    if (!sessionError || !sessionId) return;
    if (SESSION_EXIT_CODES.includes(sessionError)) {
      clearTableSession();
      router.replace('/lobby');
    }
  }, [sessionError, sessionId, clearTableSession]);

  const label = useCallback(
    (uid: string) => playerProfiles[uid]?.name ?? uid.slice(0, 8),
    [playerProfiles]
  );

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

  const soundCallbacks = useMemo(
    () => ({
      haptic: tableHaptic,
      playSound: (kind: TableSoundKind) => {
        if (soundOn) playTableSound(kind);
      }
    }),
    [soundOn]
  );

  const { events: feedEvents, pulseKey: feedPulseKey } = useTableGameFeed(
    viewSession,
    label,
    t,
    soundOn,
    { actionSounds: false, handSounds: false, streetSounds: false },
    soundOn ? (k) => playTableSound(k) : undefined
  );

  const { seatBubbles, chipFlights, jokerFlights, potPulseKey, foldingUsers, checkRippleUsers } =
    useTableAnimationQueue(
    session,
    userId,
    label,
    t,
    soundOn,
    reduceMotion,
    soundCallbacks
  );

  useCommunityCardSounds(viewSession?.communityCards?.length ?? 0, soundOn, soundOn ? (k) => playTableSound(k) : undefined);

  const sid = session?.sessionId;
  const matchRoute = sid && sessionId && sid === sessionId;

  useTableSessionTick(matchRoute ? session : undefined, sessionId, {
    apiFetch: (path, init) => apiFetch(path, init, accessToken),
    usesRealtimeSocket,
    reconnectSession,
    setSession: (s) => useTableStore.getState().setSession(s)
  });

  const activeId = useMemo(() => {
    if (!session || session.players.length === 0) return undefined;
    return session.players[session.activePlayerIndex];
  }, [session]);

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
        avatar: profile?.avatar,
        tableStatus: profile?.tableStatus,
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
  }, [viewSession, session, playerProfiles, userId, subscriptionTier, equipped, inventory]);

  const raiseBounds = useMemo(
    () => computeRaiseBounds(session, userId),
    [session, userId]
  );

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

  const handleLeaveTable = () => {
    const id = session?.sessionId ?? sessionId;
    if (leaving) return;
    setLeaving(true);
    clearTableSession();
    router.replace('/lobby');
    if (id) {
      void leaveTable(id)
        .catch(() => undefined)
        .finally(() => setLeaving(false));
    } else {
      setLeaving(false);
    }
  };

  const lastActionText = useMemo(() => {
    const log = session?.actionLog;
    if (!log?.length) return undefined;
    return formatDisplayAction(log[log.length - 1]!);
  }, [session?.actionLog, formatDisplayAction]);

  const holdemHandRankLine = useMemo(() => {
    if (!session || !viewSession) return undefined;
    const isPreflopMuckWin =
      session.street === 'COMPLETE' &&
      session.mode === 'HOLDEM' &&
      (session.communityCards?.length ?? 0) === 0;
    return isPreflopMuckWin ? undefined : holdemShowdownHandLines(viewSession, label, t);
  }, [session, viewSession, label, t]);

  if (!accessToken) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{t('table.signInRequired')}</Text>
        <Pressable onPress={() => router.replace('/login')}>
          <Text style={styles.link}>{t('table.goToLogin')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!matchRoute || !session) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.gold} size="large" />
        <Text style={styles.muted}>{t('table.connectingTo', { id: sessionId })}</Text>
        {sessionError ? (
          <Text style={styles.errorText}>{formatTableError(sessionError, t)}</Text>
        ) : null}
        <Pressable onPress={() => router.replace('/lobby')}>
          <Text style={styles.link}>{t('table.backToLobby')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const tableView = viewSession ?? session;
  const leaderboardEntries = buildTableLeaderboard(session);
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
  const matchLeaderNames = leaderboardLeaders(session).map(label).join(', ');
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
  const gameOver = isJoker ? jokerMatchOver : session.street === 'COMPLETE' && playersWithStack.length < 2;
  const heroStack = session.stacks[userId] ?? 0;
  const heroBusted = !isJoker && session.players.includes(userId) && heroStack <= 0;
  const showBustedOverlay = heroBusted && !bustedDismissed;
  const waitingForPlayers = session.street === 'LOBBY' && !showBustedOverlay;
  const kettle = sessionKettle(session);
  const viewKettle = sessionKettle(tableView);
  const { minTotal, maxTotal, canRaise, roundBet } = raiseBounds;
  const holeCards = (session.playerCards[userId] ?? []) as Card[];

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
  const holdemSidePotLine = holdemSidePotSummary(tableView, t);
  const holdemSidePotList = holdemSidePotAmounts(tableView);
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
    if (!canRaise || !sid) return;
    const total = Math.min(maxTotal, Math.max(minTotal, raiseAmount || minTotal));
    const increment = total - roundBet - need;
    playerAction({
      sessionId: sid,
      type: session.currentBet > 0 ? 'raise' : 'bet',
      amount: increment
    });
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
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
            jokerRules={session.jokerRules}
            subscriptionTier={subscriptionTier}
            onLeaveTable={handleLeaveTable}
            leaving={leaving}
            leaderboardEntries={leaderboardEntries}
            leaderboardProfiles={leaderboardProfiles}
            heroId={userId}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
          />
        }
        table={
          session.street ? (
            <View style={styles.flex}>
              <TuzovanieTableOverlay
                session={tableView}
                heroId={userId}
                deckId={equipped.deck}
                label={label}
                reduceMotion={reduceMotion}
              />
              <PokerTableSurface
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
                onLeave={handleLeaveTable}
              />
              <GameStoryPanel
                events={feedEvents}
                pulseKey={feedPulseKey}
                soundOn={soundOn}
                musicOn={musicOn}
                onSoundToggle={() => {
                  setSoundOn((v) => {
                    const next = !v;
                    void saveTableSfxPref(next);
                    return next;
                  });
                }}
                onMusicToggle={() => {
                  setMusicOn((v) => {
                    const next = !v;
                    void saveTableMusicPref(next);
                    return next;
                  });
                }}
              />
              {session.mode === 'JOKER' && session.joker ? (
                <JokerNotebookPanel joker={session.joker} players={session.players} label={label} />
              ) : null}
              {waitingForPlayers ? (
                <View style={styles.waitingOverlay}>
                  <View style={styles.waitingPanel}>
                    <Text style={styles.waitingIcon}>♠</Text>
                    <Text style={styles.waitingTitle}>
                      {isJoker ? t('table.waitingForPlayersJoker') : t('table.waitingOpponent')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
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
              halfPotRaise={Math.min(maxTotal, halfPotRaise(raiseBounds, kettle))}
              potRaise={Math.min(maxTotal, potSizedRaise(raiseBounds, kettle))}
              kettle={kettle}
              secondsLeft={secondsLeft}
              holeCards={holeCards}
              deckId={equipped.deck}
              activeLabel={activeLabel}
              isHeroActive={activeId === userId}
              lastActionText={lastActionText}
              heroSpectating={heroBusted && playersWithStack.length >= 2}
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
    </SafeAreaView>
  );
}

const s = mobileTheme.spacing;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.md,
    backgroundColor: colors.background,
    padding: s.lg
  },
  muted: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  link: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  waitingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 30
  },
  waitingPanel: {
    maxWidth: 320,
    width: '88%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    backgroundColor: 'rgba(12,12,18,0.95)',
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12
  },
  waitingIcon: {
    fontSize: 28,
    marginBottom: 12,
    color: colors.emerald
  },
  waitingTitle: {
    color: colors.goldLight,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: s.lg
  }
});
