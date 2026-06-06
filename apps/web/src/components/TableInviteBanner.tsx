import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@duopoker/ui-kit';
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
      <GlassPanel glow="emerald" className="border-emerald-500/30 p-4" data-testid="table-invite-live">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
          {t('tableInvite.liveEyebrow')}
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-ivory">{live.tableName}</p>
        <p className="mt-1 text-sm text-muted">
          {t('tableInvite.from', {
            name: live.host.displayName,
            nick: live.host.nickname
          })}
        </p>
        <button
          type="button"
          data-testid="table-invite-join"
          className="premium-btn premium-btn-primary mt-4 text-sm"
          onClick={() => {
            useAppStore.getState().resetTableJoin();
            void joinSession(live.sessionId, live.mode as 'HOLDEM' | 'JOKER', live.buyIn).then(() =>
              navigate(`/table/${live.sessionId}`)
            );
          }}
        >
          {t('tableInvite.joinTable')}
        </button>
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-light">
        {t('tableInvite.eyebrow')}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-ivory">{invite.tableName}</p>
      <p className="mt-1 text-sm text-muted">
        {invite.clubName} · @
        {invite.host.nickname}
      </p>
      <p className="mt-1 text-xs text-subtle">
        {invite.mode} · {invite.virtualBuyIn.toLocaleString()} {t('admin.chips')}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="table-invite-accept"
          disabled={busy !== null}
          className="premium-btn premium-btn-primary text-sm"
          onClick={() => void onAccept()}
        >
          {busy === 'accept' ? t('tableInvite.accepting') : t('tableInvite.accept')}
        </button>
        <button
          type="button"
          data-testid="table-invite-decline"
          disabled={busy !== null}
          className="premium-btn premium-btn-ghost text-sm"
          onClick={() => void onDecline()}
        >
          {busy === 'decline' ? t('tableInvite.declining') : t('tableInvite.decline')}
        </button>
        <button
          type="button"
          data-testid="table-invite-view"
          className="premium-btn premium-btn-ghost text-sm"
          onClick={() => navigate(`/invite/${invite.inviteCode}`)}
        >
          {t('tableInvite.view')}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </GlassPanel>
  );
}
