import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, GlassPanel } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

export function TableInviteBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accessToken = useAppStore((s) => s.accessToken);
  const tableInvites = useAppStore((s) => s.tableInvites);
  const tableLiveSessions = useAppStore((s) => s.tableLiveSessions);
  const fetchTableInvites = useAppStore((s) => s.fetchTableInvites);
  const joinSession = useAppStore((s) => s.joinSession);
  const acceptTableInvite = useAppStore((s) => s.acceptTableInvite);
  const declineTableInvite = useAppStore((s) => s.declineTableInvite);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void fetchTableInvites();
  }, [accessToken, fetchTableInvites]);

  if (!accessToken) return null;

  if (tableLiveSessions.length) {
    const live = tableLiveSessions[0]!;
    return (
      <GlassPanel
        glow="emerald"
        className="border-emerald-500/30 p-4"
        data-testid="table-invite-live"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
              {t('tableInvite.liveEyebrow')}
            </p>
            <p className="mt-1 font-display text-base font-semibold text-ivory sm:text-lg">{live.tableName}</p>
            <p className="mt-1 text-sm text-muted">
              {t('tableInvite.from', {
                name: live.host.displayName,
                nick: live.host.nickname
              })}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="table-invite-join"
            className="shrink-0"
            onClick={() => {
              useAppStore.getState().resetTableJoin();
              void joinSession(live.sessionId, live.mode as 'HOLDEM' | 'JOKER', live.buyIn).then(() =>
                navigate(`/table/${live.sessionId}`)
              );
            }}
          >
            {t('tableInvite.joinTable')}
          </Button>
        </div>
      </GlassPanel>
    );
  }

  if (!tableInvites.length) return null;

  const invite = tableInvites[0]!;

  const onAccept = async () => {
    setBusy('accept');
    setError(null);
    try {
      const { clubId } = await acceptTableInvite(invite.inviteCode);
      navigate(`/clubs/${clubId}`);
    } catch {
      setError(t('tableInvite.acceptFailed'));
    } finally {
      setBusy(null);
    }
  };

  const onDecline = async () => {
    setBusy('decline');
    setError(null);
    try {
      await declineTableInvite(invite.id);
    } catch {
      setError(t('tableInvite.declineFailed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassPanel glow="gold" className="border-gold/30 p-4" data-testid="table-invite-pending">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-light">
            {t('tableInvite.eyebrow')}
          </p>
          <p className="mt-1 font-display text-base font-semibold text-ivory sm:text-lg">{invite.tableName}</p>
          <p className="mt-1 text-sm text-muted">
            {invite.clubName} · @{invite.host.nickname}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {invite.mode} · {invite.virtualBuyIn.toLocaleString()} {t('admin.chips')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="table-invite-accept"
            disabled={busy !== null}
            onClick={() => void onAccept()}
          >
            {busy === 'accept' ? t('tableInvite.accepting') : t('tableInvite.accept')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="table-invite-decline"
            disabled={busy !== null}
            onClick={() => void onDecline()}
          >
            {busy === 'decline' ? t('tableInvite.declining') : t('tableInvite.decline')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="table-invite-view"
            onClick={() => navigate(`/invite/${invite.inviteCode}`)}
          >
            {t('tableInvite.view')}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </GlassPanel>
  );
}
