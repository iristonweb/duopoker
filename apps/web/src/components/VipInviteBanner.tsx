import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, GlassPanel } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

export function VipInviteBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const accessToken = useAppStore((s) => s.accessToken);
  const vipInvites = useAppStore((s) => s.vipInvites);
  const vipLiveSession = useAppStore((s) => s.vipLiveSession);
  const fetchVipInvites = useAppStore((s) => s.fetchVipInvites);
  const acceptVipInvite = useAppStore((s) => s.acceptVipInvite);
  const declineVipInvite = useAppStore((s) => s.declineVipInvite);
  const joinSession = useAppStore((s) => s.joinSession);
  const [busy, setBusy] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void fetchVipInvites();
  }, [accessToken, fetchVipInvites]);

  if (!accessToken) return null;

  if (vipLiveSession) {
    return (
      <GlassPanel glow="emerald" className="border-emerald-500/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {t('vipInvite.liveEyebrow')}
            </p>
            <p className="mt-1 font-display text-base font-semibold text-ivory sm:text-lg">
              {t('vipInvite.liveTitle')}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t('vipInvite.from', {
                name: vipLiveSession.host.displayName,
                nick: vipLiveSession.host.nickname
              })}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="shrink-0"
            onClick={() => {
              useAppStore.getState().resetTableJoin();
              void joinSession(
                vipLiveSession.sessionId,
                vipLiveSession.mode as 'HOLDEM' | 'JOKER',
                vipLiveSession.buyIn
              ).then(() => navigate(`/table/${vipLiveSession.sessionId}`));
            }}
          >
            {t('vipInvite.joinTable')}
          </Button>
        </div>
      </GlassPanel>
    );
  }

  if (!vipInvites.length) return null;

  const invite = vipInvites[0]!;

  const onAccept = async () => {
    setBusy('accept');
    setError(null);
    try {
      await acceptVipInvite(invite.duelId);
      await fetchVipInvites();
    } catch {
      setError(t('vipInvite.acceptFailed', { defaultValue: t('admin.actionFailed') }));
    } finally {
      setBusy(null);
    }
  };

  const onDecline = async () => {
    setBusy('decline');
    setError(null);
    try {
      await declineVipInvite(invite.duelId);
      await fetchVipInvites();
    } catch {
      setError(t('vipInvite.declineFailed', { defaultValue: t('admin.actionFailed') }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassPanel glow="gold" className="border-gold/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
            {t('vipInvite.eyebrow')}
          </p>
          <p className="mt-1 font-display text-base font-semibold text-ivory sm:text-lg">
            {t('vipInvite.title')}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('vipInvite.from', {
              name: invite.host.displayName,
              nick: invite.host.nickname
            })}
            {invite.message ? ` — ${invite.message}` : ''}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {invite.mode} · {invite.buyIn.toLocaleString()} {t('admin.chips')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            data-testid="vip-invite-accept"
            disabled={busy !== null}
            onClick={() => void onAccept()}
          >
            {busy === 'accept' ? t('tableInvite.accepting') : t('vipInvite.accept')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="vip-invite-decline"
            disabled={busy !== null}
            onClick={() => void onDecline()}
          >
            {busy === 'decline' ? t('tableInvite.declining') : t('vipInvite.decline')}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </GlassPanel>
  );
}
