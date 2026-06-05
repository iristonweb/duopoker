import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppBackground, Button, GlassPanel } from '@duopoker/ui-kit';
import type { SessionState } from '@duopoker/shared-types/index';
import { PokerTable3D } from '../components/PokerTable3D';
import { useAppStore } from '../store/useAppStore';
import { usesRealtimeSocket } from '../config/api';

const maxRoundBet = (s: SessionState) =>
  s.players.reduce((m, p) => Math.max(m, s.playerRoundBet[p] ?? 0), 0);

const amountToCall = (s: SessionState, uid: string) =>
  Math.max(0, maxRoundBet(s) - (s.playerRoundBet[uid] ?? 0));

export const Table = () => {
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

  const [raiseAmount, setRaiseAmount] = useState(0);

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

  const activeId = useMemo(() => {
    if (!session || session.players.length === 0) return undefined;
    return session.players[session.activePlayerIndex];
  }, [session]);

  useEffect(() => {
    if (session?.bigBlind) setRaiseAmount(session.bigBlind);
  }, [session?.bigBlind, session?.handNumber]);

  if (!routeSessionId) {
    return (
      <div className="relative min-h-screen">
        <AppBackground />
        <p className="p-8 text-muted">Invalid table.</p>
      </div>
    );
  }

  if (!matchRoute || !session) {
    return (
      <div className="relative min-h-screen">
        <AppBackground />
        <div className="relative z-10 mx-auto max-w-lg px-4 py-16">
          <GlassPanel className="border-white/10 p-6">
            <p className="text-sm text-muted">
              Connecting to table <span className="font-mono text-zinc-200">{routeSessionId}</span>…
            </p>
            <p className="mt-2 text-xs text-subtle">Open this link after matchmaking found you a seat.</p>
            <Link to="/lobby" className="mt-4 inline-block text-sm text-gold hover:underline">
              Back to lobby
            </Link>
          </GlassPanel>
        </div>
      </div>
    );
  }

  const need = amountToCall(session, userId);
  const myTurn = activeId === userId && session.street !== 'LOBBY' && session.street !== 'COMPLETE';
  const kettle =
    session.pot +
    Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Table</p>
            <h1 className="font-sans text-xl font-semibold text-zinc-100">
              {session.mode === 'HOLDEM' ? "Hold'em" : 'Raspisnoy'}
              <span className="ml-2 font-mono text-sm text-muted">{session.sessionId}</span>
            </h1>
          </div>
          <Link to="/lobby">
            <Button variant="ghost" size="sm">
              Lobby
            </Button>
          </Link>
        </div>

        {session.street && session.street !== 'LOBBY' ? (
          <div className="mb-6">
            {session.mode === 'HOLDEM' ? (
              <PokerTable3D
                communityCards={session.communityCards ?? []}
                pot={kettle}
                street={session.street}
              />
            ) : (
              <PokerTable3D communityCards={[]} pot={kettle} street={session.street} />
            )}
          </div>
        ) : null}

        <GlassPanel className="border-white/10 p-5">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-emerald/90">
              {session.street}
            </span>
            {activeId ? (
              <span className="text-muted">
                To act: <span className="text-zinc-200">{activeId.slice(0, 8)}…</span>
                {activeId === userId ? ' (you)' : ''}
              </span>
            ) : null}
            <span className="text-muted">Your hole: {(session.playerCards[userId] ?? []).join(' ') || '—'}</span>
          </div>

          {session.street === 'COMPLETE' ? (
            <div className="mt-4">
              <p className="text-sm text-muted">
                Hand complete. Winners: {(session.winners ?? []).join(', ') || '—'}
              </p>
              <p className="mt-1 text-xs text-subtle">
                Ready: {(session.readyForNextHand ?? []).length}/{session.players.length}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={(session.readyForNextHand ?? []).includes(userId)}
                onClick={() => readyNextHand()}
              >
                {(session.readyForNextHand ?? []).includes(userId) ? 'Waiting for others…' : 'Next hand'}
              </Button>
            </div>
          ) : null}

          {myTurn ? (
            <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-5">
              <p className="text-xs text-subtle">Your action — to call: {need}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => playerAction({ sessionId: sid, type: 'fold' })}>
                  Fold
                </Button>
                {need === 0 ? (
                  <Button variant="secondary" size="sm" onClick={() => playerAction({ sessionId: sid, type: 'check' })}>
                    Check
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => playerAction({ sessionId: sid, type: 'call' })}>
                    Call {need}
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={session.bigBlind}
                    className="w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1 font-mono text-sm text-zinc-100"
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
                    {session.currentBet > 0 ? 'Raise' : 'Bet'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Waiting for opponent…</p>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};
