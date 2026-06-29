import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, cn } from '@duopoker/ui-kit';
import { useAppStore } from '../../store/useAppStore';
import { useTableStore } from '../../store/useTableStore';

export function TableBackgroundBanner() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const tableMinimized = useAppStore((s) => s.tableMinimized);
  const session = useTableStore((s) => s.session);
  const userId = useAppStore((s) => s.userId);
  const resumeTable = useAppStore((s) => s.resumeTable);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!tableMinimized || !session) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [tableMinimized, session]);

  const activeId = useMemo(() => {
    if (!session || session.players.length === 0) return undefined;
    return session.players[session.activePlayerIndex];
  }, [session]);

  const myTurn =
    Boolean(session && activeId === userId && session.street !== 'LOBBY' && session.street !== 'COMPLETE');

  const secondsLeft =
    myTurn && session?.actionDeadlineAt
      ? Math.max(0, Math.ceil((session.actionDeadlineAt - now) / 1000))
      : null;

  if (!tableMinimized || !session?.sessionId) return null;
  if (pathname.startsWith('/table/')) return null;

  const pot =
    session.pot +
    Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  const handleReturn = () => {
    resumeTable();
    navigate(`/table/${encodeURIComponent(session.sessionId)}`);
  };

  return (
    <div
      data-testid="table-background-banner"
      className={cn(
        'pointer-events-auto fixed inset-x-3 z-[90] mx-auto max-w-lg',
        'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'
      )}
    >
      <div
        className={cn(
          'glass-shine flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-panel backdrop-blur-xl',
          myTurn ? 'border-gold/45 bg-gold/[0.08] shadow-glow-gold' : 'border-white/12 bg-background/95'
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.2em] text-gold/70">
            {session.mode === 'HOLDEM' ? t('table.holdem') : t('table.joker')}
          </p>
          <p className="truncate text-sm text-zinc-200">
            {t('table.pot')}: <span className="font-mono font-semibold text-gold-light">{pot.toLocaleString()}</span>
            {myTurn ? (
              <span className="ml-2 font-semibold text-emerald">
                · {t('table.yourTurnBanner')}
                {secondsLeft !== null ? ` (${secondsLeft}s)` : ''}
              </span>
            ) : null}
          </p>
        </div>
        <Button variant="primary" size="sm" className="shrink-0 px-3 text-xs" onClick={handleReturn}>
          {t('table.returnToTable')}
        </Button>
      </div>
    </div>
  );
}
