import { motion } from 'framer-motion';
import { GlassPanel } from '@duopoker/ui-kit';
import { PokerTable3D } from '../../PokerTable3D';
import { GameTableShell } from '../GameTableShell';
import { TableTopHUD } from '../TableTopHUD';
import { TableActionDock } from '../TableActionDock';
import { JokerActionDock } from '../JokerActionDock';
import { HandResultOverlay } from '../HandResultOverlay';
import { GameStoryPanel } from '../GameStoryPanel';
import { JokerNotebookPanel } from '../JokerNotebookPanel';
import { BustedPlayerOverlay } from '../BustedPlayerOverlay';
import { AllInRunoutBanner } from '../AllInRunoutBanner';
import { TableActionTicker } from '../TableActionTicker';
import { TuzovanieTableOverlay } from '../TuzovanieTableOverlay';
import { TableLeaderboardPanel } from '../TableLeaderboardPanel';
import { TableSideFabStack } from '../TableSideFabStack';
import { MobileTableSurface } from './mobile/MobileTableSurface';
import { MobilePerformanceLayer } from './mobile/MobilePerformanceLayer';
import type { TableLayoutProps } from './table-layout-types';

type Variant = 'desktop' | 'tablet' | 'classic';

type Props = TableLayoutProps & {
  variant: Variant;
  overlay?: React.ReactNode;
  onChatOpen?: () => void;
  chatUnread?: number;
};

export function StandardTableLayout({
  variant,
  overlay,
  onChatOpen,
  chatUnread = 0,
  ...p
}: Props) {
  const isTablet = variant === 'tablet';
  const isClassicMobile = variant === 'classic';
  const surfaceLayout = isClassicMobile ? 'mobile-arc' : 'ring';
  const dockTouchClass = isTablet ? '[&_button]:min-h-[48px] [&_button]:text-sm' : undefined;

  const tableSurface = isClassicMobile ? (
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
      foldingUsers={p.foldingUsers}
      checkRippleUsers={p.checkRippleUsers}
      activeUserId={p.activeUserId}
      secondsLeft={p.activeSecondsLeft}
      deckShuffling={p.deckShuffling}
      reduceMotion={p.reduceMotion}
      className="h-full"
    />
  ) : (
    <PokerTable3D
      communityCards={p.jokerBoardCards}
      boardCardKeys={p.jokerBoardKeys}
      handNumber={p.tableView.handNumber}
      showBoardSlots={p.tableView.mode !== 'JOKER'}
      ghostCommunityCards={
        p.ghostBoardVisible && p.canPeekGhostBoard ? (p.tableView.ghostCommunityCards ?? []) : []
      }
      pot={p.viewKettle}
      street={p.tableView.street === 'LOBBY' ? 'COMPLETE' : p.tableView.street}
      players={p.tablePlayers}
      heroDeckId={p.equipped.deck}
      heroChipId={p.equipped.chip}
      heroTableFeltId={p.equipped.table}
      seatBubbles={p.seatBubbles}
      chipFlights={p.chipFlights}
      jokerFlights={p.jokerFlights}
      potPulseKey={p.potPulseKey}
      sidePots={p.holdemSidePotList}
      foldingUsers={p.foldingUsers}
      checkRippleUsers={p.checkRippleUsers}
      activeUserId={p.activeUserId}
      activeSecondsLeft={p.activeSecondsLeft}
      deckShuffling={p.deckShuffling}
      className="h-full"
    />
  );

  return (
    <GameTableShell
      overlay={overlay}
      hud={
        <TableTopHUD
          mode={p.tableView.mode}
          street={p.tableView.street}
          seatCount={p.tableView.players.length}
          smallBlind={p.tableView.smallBlind}
          bigBlind={p.tableView.bigBlind}
          handNumber={p.tableView.handNumber}
          joker={p.tableView.mode === 'JOKER' ? p.tableView.joker : null}
          jokerRules={p.session.jokerRules}
          onLeaveTable={p.onLeaveTable}
          onMinimizeTable={p.onMinimizeTable}
          leaving={p.leaving}
          leaderboardEntries={p.leaderboardEntries}
          leaderboardProfiles={p.leaderboardProfiles}
          heroId={p.userId}
          session={p.session}
          onOpenLeaderboard={() => p.onLeaderboardOpenChange(true)}
          onChatOpen={onChatOpen}
          chatUnread={chatUnread}
          hidePodium={
            (p.tableView.street === 'COMPLETE' && p.session.street === 'COMPLETE') || p.gameOver
          }
          layoutVariant={isTablet ? 'tablet' : variant === 'classic' ? 'compact' : 'desktop'}
        />
      }
      table={
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="relative flex h-full min-h-0 flex-col px-0.5 table-compact:px-0"
          >
            {isClassicMobile ? <MobilePerformanceLayer active /> : null}
            <TuzovanieTableOverlay
              session={p.tableView}
              heroId={p.userId}
              deckId={p.equipped.deck}
              label={p.label}
              t={p.t}
              reduceMotion={p.reduceMotion}
              surfaceLayout={surfaceLayout}
            />
            {tableSurface}
            <AllInRunoutBanner
              visible={p.showAllInRunoutBanner}
              className={surfaceLayout === 'mobile-arc' ? 'top-[9%]' : 'top-[11%]'}
            />
            <TableActionTicker
              events={p.feedEvents}
              pulseKey={p.feedPulseKey}
              hideWhenHeroActive={p.myTurn}
              className={surfaceLayout === 'mobile-arc' ? 'top-[52%]' : 'top-[50%]'}
            />
            <HandResultOverlay
              visible={p.tableView.street === 'COMPLETE' && p.session.street === 'COMPLETE'}
              winners={p.isJoker || p.holdemPayoutSummary ? undefined : p.winnerNames}
              summaryText={
                p.isJoker && p.jokerHandSummary
                  ? p.t('table.jokerHandSummary', { summary: p.jokerHandSummary })
                  : p.holdemPayoutSummary ?? undefined
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
            />
            <BustedPlayerOverlay
              visible={p.showBustedOverlay}
              leaving={p.leaving}
              onWatch={p.onBustedWatch}
              onLeave={p.onLeaveTable}
            />
            <TableSideFabStack layoutVariant={variant}>
              <GameStoryPanel
                events={p.feedEvents}
                pulseKey={p.feedPulseKey}
                layoutVariant={variant}
                collapseMobileToolbar={p.myTurn}
                suppressHandCompleteDupes={
                  p.tableView.street === 'COMPLETE' && p.session.street === 'COMPLETE'
                }
                soundOn={p.soundOn}
                musicOn={p.musicOn}
                onSoundToggle={p.onSoundToggle}
                onMusicToggle={p.onMusicToggle}
                soundOnLabel={p.t('table.soundOn')}
                soundOffLabel={p.t('table.soundOff')}
                musicOnLabel={p.t('table.musicOn')}
                musicOffLabel={p.t('table.musicOff')}
                title={p.t('table.feedTitle')}
                openLabel={p.t('table.feedOpenHistory')}
                closeLabel={p.t('table.feedCloseHistory')}
                emptyLabel={p.t('table.feedEmpty')}
              />
            </TableSideFabStack>
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
              />
            ) : null}
            {p.waitingForPlayers ? (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
                <GlassPanel glow="emerald" className="pointer-events-auto max-w-md border-emerald/20 p-8 text-center">
                  <p className="font-display text-xl text-gradient-gold">
                    {p.isJoker ? p.t('table.waitingForPlayersJoker') : p.t('table.waitingOpponent')}
                  </p>
                </GlassPanel>
              </div>
            ) : null}
          </motion.div>
      }
      dock={
        p.session.mode === 'JOKER' && p.session.joker ? (
          <JokerActionDock
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
            className={dockTouchClass}
          />
        ) : (
          <TableActionDock
            myTurn={p.myTurn}
            need={p.need}
            currentBet={p.session.currentBet}
            minTotal={p.minTotal}
            maxTotal={p.maxTotal}
            canRaise={p.canRaise}
            raiseAmount={p.raiseAmount}
            onRaiseAmountChange={p.onRaiseAmountChange}
            halfPotRaise={p.halfPotRaise}
            potRaise={p.potRaise}
            kettle={p.kettle}
            secondsLeft={p.secondsLeft}
            holeCards={p.holeCards}
            deckId={p.equipped.deck}
            activeLabel={p.activeLabel}
            isHeroActive={p.myTurn}
            lastActionText={p.lastActionText}
            heroSpectating={p.heroSpectating}
            street={p.session.street}
            sessionError={p.sessionError}
            onFold={p.onFold}
            onCheck={p.onCheck}
            onCall={p.onCall}
            onRaise={p.onRaise}
            className={dockTouchClass}
          />
        )
      }
    />
  );
}
