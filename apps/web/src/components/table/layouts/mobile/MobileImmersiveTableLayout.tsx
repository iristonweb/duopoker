import { useCallback, useEffect, useRef, useState } from 'react';
import { AppBackground, GlassPanel } from '@duopoker/ui-kit';
import { motion } from 'framer-motion';
import { useViewportHeight } from '../../../../hooks/useViewportHeight';
import { formatTableError, useTableChat } from '@duopoker/table-client';
import { useAppStore } from '../../../../store/useAppStore';
import { useTableFullscreen } from '../../../../hooks/useTableFullscreen';
import { useTableDockHeight } from '../../../../hooks/useTableDockHeight';
import { loadTableImmersivePref, saveTableImmersivePref } from '../../../../lib/table-layout-prefs';
import { notifyTableLayoutPrefChange } from '../../../../hooks/useTableLayoutMode';
import { HandResultOverlay } from '../../HandResultOverlay';
import { BustedPlayerOverlay } from '../../BustedPlayerOverlay';
import { TableLeaderboardPanel } from '../../TableLeaderboardPanel';
import { TuzovanieTableOverlay } from '../../TuzovanieTableOverlay';
import { JokerNotebookPanel } from '../../JokerNotebookPanel';
import { MobileJokerActionDock } from './MobileJokerActionDock';
import { TableBottomDrawer } from '../../primitives/TableBottomDrawer';
import { TableChatDrawer } from '../../chat/TableChatDrawer';
import { TablePlayerProfileSheet } from '../../chat/TablePlayerProfileSheet';
import { MobilePerformanceLayer } from './MobilePerformanceLayer';
import { MobileFullscreenPrompt } from './MobileFullscreenPrompt';
import { MobileTableTopBar } from './MobileTableTopBar';
import { MobileTableSurface } from './MobileTableSurface';
import { MobileHeroCardFan } from './MobileHeroCardFan';
import { MobileActionDock } from './MobileActionDock';
import { MobileTableOverflowMenu } from './MobileTableOverflowMenu';
import type { TableLayoutProps } from '../table-layout-types';

export function MobileImmersiveTableLayout(p: TableLayoutProps) {
  useViewportHeight();
  const dockRef = useRef<HTMLElement | null>(null);
  const bottomStackVars = useCallback(
    (height: string) => ({
      '--mobile-table-bottom-clearance': `calc(${height} + var(--mobile-hero-card-height, 7.75rem) + 0.75rem)`,
      '--mobile-hero-card-bottom': `calc(${height} + 0.5rem)`
    }),
    []
  );
  useTableDockHeight(dockRef, {
    cssVar: '--mobile-table-dock-height',
    fallback: '6.875rem',
    extraVars: bottomStackVars
  });
  const setDockNode = useCallback((node: HTMLElement | null) => {
    dockRef.current = node;
  }, []);
  const socket = useAppStore((s) => s.socket);
  const apiFetch = useAppStore((s) => s.apiFetch);
  const chat = useTableChat(p.sessionId, socket, {
    apiFetch,
    realtime: p.realtimeSocket ?? false
  });
  const fullscreen = useTableFullscreen(true);

  useEffect(() => () => void fullscreen.exitFullscreen(), [fullscreen.exitFullscreen]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [immersiveOn, setImmersiveOn] = useState(() => loadTableImmersivePref());

  const streetLabel = p.tableView.street
    ? p.t(`table.street.${p.tableView.street}`, { defaultValue: p.tableView.street })
    : null;
  const potLabel = p.tableView.mode === 'JOKER' ? p.t('table.jokerPoolLabel') : p.t('table.pot');
  const heroStack = p.session.stacks[p.userId] ?? 0;
  const profile = profileUserId ? p.playerProfiles[profileUserId] : null;

  const toggleImmersive = () => {
    const next = !immersiveOn;
    setImmersiveOn(next);
    saveTableImmersivePref(next);
    notifyTableLayoutPrefChange();
  };

  return (
    <div
      data-testid="mobile-immersive-table"
      className="relative flex h-[calc(var(--app-vh,1vh)*100)] min-h-0 w-full flex-col overflow-hidden overscroll-none"
      style={{
        ['--mobile-hero-card-height' as string]: '7.75rem'
      }}
    >
      <MobilePerformanceLayer active />
      <AppBackground />

      <MobileTableTopBar
        mode={p.tableView.mode}
        pot={p.viewKettle}
        street={p.tableView.street}
        handNumber={p.tableView.handNumber}
        chipId={p.equipped.chip}
        joker={p.tableView.mode === 'JOKER' ? p.tableView.joker : null}
        secondsLeft={p.myTurn ? p.secondsLeft : null}
        isHeroTurn={p.myTurn}
        potLabel={potLabel}
        streetLabel={streetLabel}
      />

      <TuzovanieTableOverlay
        session={p.tableView}
        heroId={p.userId}
        deckId={p.equipped.deck}
        label={p.label}
        t={p.t}
        reduceMotion={p.reduceMotion}
      />

      <MobileTableSurface
        communityCards={p.jokerBoardCards}
        boardCardKeys={p.jokerBoardKeys}
        pot={p.viewKettle}
        street={p.tableView.street === 'LOBBY' ? 'COMPLETE' : p.tableView.street}
        players={p.tablePlayers}
        heroDeckId={p.equipped.deck}
        heroChipId={p.equipped.chip}
        heroTableFeltId={p.equipped.table}
        seatBubbles={p.seatBubbles}
        chipFlights={p.chipFlights}
        potPulseKey={p.potPulseKey}
        sidePots={p.holdemSidePotList}
        showBoardSlots={p.tableView.mode !== 'JOKER'}
        ghostCommunityCards={
          p.ghostBoardVisible && p.canPeekGhostBoard ? (p.tableView.ghostCommunityCards ?? []) : []
        }
        secondsLeft={p.secondsLeft}
        activeUserId={p.session.players[p.session.activePlayerIndex]}
        onAvatarTap={setProfileUserId}
        reduceMotion={p.reduceMotion}
        className="pb-[var(--mobile-table-bottom-clearance,15.375rem)]"
      />

      <HandResultOverlay
        visible={
          p.tableView.street === 'COMPLETE' &&
          p.session.street === 'COMPLETE' &&
          !p.showBustedOverlay
        }
        winners={p.isJoker || p.holdemPayoutSummary ? undefined : p.winnerNames}
        summaryText={
          p.isJoker && p.jokerHandSummary
            ? p.t('table.jokerHandSummary', { summary: p.jokerHandSummary })
            : (p.holdemPayoutSummary ?? undefined)
        }
        handRankLine={p.holdemHandRankLine}
        sidePotLine={p.holdemSidePotLine}
        gameOver={p.gameOver}
        gameOverMessage={
          p.jokerMatchOver
            ? p.t('table.jokerMatchLeader', { names: p.matchLeaderNames || '—' })
            : p.gameOver
              ? p.t('table.holdemLeader', { names: p.matchLeaderNames || p.winnerNames || '—' })
              : undefined
        }
        nextHandSeconds={p.jokerMatchOver ? null : p.nextHandSeconds}
        canPeekGhostBoard={p.canPeekGhostBoard}
        ghostBoardVisible={p.ghostBoardVisible}
        onToggleGhostBoard={p.onToggleGhostBoard}
        showGhostUpsell={p.showGhostUpsell}
        leaderboardEntries={p.gameOver ? p.leaderboardEntries : undefined}
        leaderboardProfiles={p.gameOver ? p.leaderboardProfiles : undefined}
        heroId={p.userId}
        mode={p.tableView.mode}
        buyIn={p.session.buyIn}
      />

      <TableLeaderboardPanel
        entries={p.leaderboardEntries}
        mode={p.tableView.mode}
        heroId={p.userId}
        profiles={p.leaderboardProfiles}
        open={p.leaderboardOpen}
        onOpenChange={p.onLeaderboardOpenChange}
        buyIn={p.session.buyIn}
        showFab={false}
      />

      {p.session.mode === 'JOKER' && p.session.joker ? (
        <JokerNotebookPanel
          joker={p.session.joker}
          players={p.session.players}
          label={p.label}
          title={p.t('table.notebookTitle')}
          openLabel={p.t('table.notebookOpen')}
          closeLabel={p.t('table.notebookClose')}
          dealLabel={p.t('table.notebookDeal')}
          bidLabel={p.t('table.notebookBid')}
          tricksLabel={p.t('table.notebookTricks')}
          pointsLabel={p.t('table.notebookPoints')}
          totalLabel={p.t('table.notebookTotal')}
          poolPremiumLabel={p.t('table.notebookPoolPremium')}
          liveLabel={p.t('table.notebookLive')}
          modeLabel={p.t('table.joker')}
          hideFab
          open={notebookOpen}
          onOpenChange={setNotebookOpen}
        />
      ) : null}

      {p.waitingForPlayers ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-6">
          <GlassPanel
            glow="emerald"
            className="pointer-events-auto max-w-sm border-emerald/20 p-6 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-emerald/40 bg-emerald/10 text-xl"
            >
              ♠
            </motion.div>
            <p className="font-display text-lg text-gradient-gold">
              {p.isJoker ? p.t('table.waitingForPlayersJoker') : p.t('table.waitingOpponent')}
            </p>
          </GlassPanel>
        </div>
      ) : null}

      <BustedPlayerOverlay
        visible={p.showBustedOverlay}
        leaving={p.leaving}
        onWatch={p.onBustedWatch}
        onLeave={p.onLeaveTable}
      />

      <MobileHeroCardFan cards={p.holeCards} deckId={p.equipped.deck} />

      {p.session.mode === 'JOKER' && p.session.joker ? (
        <MobileJokerActionDock
          myTurn={p.myTurn}
          street={p.session.street}
          holeCards={p.holeCards}
          deckId={p.equipped.deck}
          joker={p.session.joker}
          bidAmount={p.jokerBid}
          maxBid={Math.min(9, p.session.joker.cardsThisDeal)}
          userId={p.userId}
          dealerId={p.session.players[p.session.dealerIndex]!}
          playerIds={p.session.players}
          onBidAmountChange={p.onJokerBidChange}
          secondsLeft={p.secondsLeft}
          activeLabel={p.activeLabel}
          isHeroActive={p.myTurn}
          lastActionText={p.lastActionText}
          sessionError={p.sessionError}
          actionLogLen={p.session.actionLog?.length ?? 0}
          strictJoker={p.session.jokerRules?.strictJoker}
          onBid={p.onJokerBid}
          onPlayCard={p.onJokerPlayCard}
          onChooseTrump={p.onJokerChooseTrump}
          onChatOpen={chat.openDrawer}
          onMenuOpen={() => setMenuOpen(true)}
          chatUnread={chat.unread}
          chatLabel={p.t('table.mobile.chat')}
          menuLabel={p.t('table.mobile.menu')}
          stack={heroStack}
          stackLabel={p.t('table.stack')}
          dockRef={setDockNode}
        />
      ) : (
        <MobileActionDock
          myTurn={p.myTurn}
          need={p.need}
          minTotal={p.minTotal}
          maxTotal={p.maxTotal}
          canRaise={p.canRaise}
          raiseAmount={p.raiseAmount}
          onRaiseAmountChange={p.onRaiseAmountChange}
          kettle={p.kettle}
          secondsLeft={p.secondsLeft}
          holeCards={p.holeCards}
          deckId={p.equipped.deck}
          activeLabel={p.activeLabel}
          street={p.session.street}
          heroSpectating={p.heroSpectating}
          sessionError={p.sessionError}
          stack={heroStack}
          onFold={p.onFold}
          onCheck={p.onCheck}
          onCall={p.onCall}
          onRaise={p.onRaise}
          onChatOpen={chat.openDrawer}
          onMenuOpen={() => setMenuOpen(true)}
          chatUnread={chat.unread}
          chatLabel={p.t('table.mobile.chat')}
          menuLabel={p.t('table.mobile.menu')}
          t={p.t}
          dockRef={setDockNode}
        />
      )}

      <TableChatDrawer
        open={chat.drawerOpen}
        onClose={chat.closeDrawer}
        messages={chat.messages}
        onSend={chat.sendMessage}
        title={p.t('table.mobile.chat')}
        closeLabel={p.t('table.feedCloseHistory')}
        placeholder={p.t('table.mobile.chatPlaceholder')}
        sendLabel={p.t('table.mobile.chatSend')}
        heroId={p.userId}
        error={chat.chatError ? formatTableError(chat.chatError, p.t) : null}
      />

      <MobileTableOverflowMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={p.t('table.mobile.menu')}
        closeLabel={p.t('table.feedCloseHistory')}
        onLeave={p.onLeaveTable}
        onMinimize={p.onMinimizeTable}
        onSoundToggle={p.onSoundToggle}
        onMusicToggle={p.onMusicToggle}
        onHistoryOpen={() => setHistoryOpen(true)}
        onLeaderboardOpen={() => p.onLeaderboardOpenChange(true)}
        onNotebookOpen={p.session.mode === 'JOKER' ? () => setNotebookOpen(true) : undefined}
        notebookLabel={p.session.mode === 'JOKER' ? p.t('table.notebookOpen') : undefined}
        onImmersiveToggle={toggleImmersive}
        immersiveOn={immersiveOn}
        soundOn={p.soundOn}
        musicOn={p.musicOn}
        leaveLabel={p.t('table.leaveShort')}
        minimizeLabel={p.t('table.minimizeTable')}
        soundLabel={p.t('table.soundOn')}
        musicLabel={p.t('table.musicOn')}
        historyLabel={p.t('table.mobile.history')}
        leaderboardLabel={p.t('table.leaderboard')}
        immersiveLabel={p.t('profile.mobileImmersiveTable')}
        immersiveHint={p.t('profile.mobileImmersiveTableHint')}
      />

      <TableBottomDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={p.t('table.mobile.history')}
        closeLabel={p.t('table.feedCloseHistory')}
        noBlur
        maxHeight="tall"
      >
        <div className="space-y-2 px-4 py-3">
          {p.feedEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-subtle">{p.t('table.feedEmpty')}</p>
          ) : (
            p.feedEvents.map((ev) => (
              <div key={ev.id} className="rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-ivory">
                {ev.text}
              </div>
            ))
          )}
        </div>
      </TableBottomDrawer>

      {profile ? (
        <TablePlayerProfileSheet
          open={Boolean(profileUserId)}
          onClose={() => setProfileUserId(null)}
          closeLabel={p.t('table.feedCloseHistory')}
          name={profile.name}
          avatar={profile.avatar}
          tableStatus={profile.tableStatus}
          tier={profile.subscriptionTier}
        />
      ) : null}

      <MobileFullscreenPrompt
        open={fullscreen.promptOpen}
        title={p.t('table.mobile.fullscreenPrompt')}
        hint={p.t('table.mobile.fullscreenHint')}
        acceptLabel={p.t('table.mobile.fullscreenAccept')}
        declineLabel={p.t('table.mobile.fullscreenDecline')}
        onAccept={fullscreen.enterFullscreen}
        onDecline={fullscreen.dismissPrompt}
      />
    </div>
  );
}
