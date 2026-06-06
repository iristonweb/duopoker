import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@duopoker/ui-kit';
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

  useEffect(() => {
    if (!accessToken) return;
    void fetchVipInvites();
    const timer = setInterval(() => void fetchVipInvites(), 45_000);
    return () => clearInterval(timer);
  }, [accessToken, fetchVipInvites]);

  if (!accessToken) return null;

  if (vipLiveSession) {
    return (
      <GlassPanel glow="emerald" className="border-emerald-500/30 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {t('vipInvite.liveEyebrow')}
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-ivory">{t('vipInvite.liveTitle')}</p>
        <p className="mt-1 text-sm text-muted">
          {t('vipInvite.from', {
            name: vipLiveSession.host.displayName,
            nick: vipLiveSession.host.nickname
          })}
        </p>
        <button
          type="button"
          className="premium-btn premium-btn-primary mt-4 text-sm"
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
        </button>
      </GlassPanel>
    );
  }

  if (!vipInvites.length) return null;

  const invite = vipInvites[0]!;

  return (
    <GlassPanel glow="gold" className="border-gold/30 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
        {t('vipInvite.eyebrow')}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-ivory">{t('vipInvite.title')}</p>
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
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="premium-btn premium-btn-primary text-sm" onClick={() => void acceptVipInvite(invite.duelId).then(() => fetchVipInvites())}>
          {t('vipInvite.accept')}
        </button>
        <button
          type="button"
          className="premium-btn premium-btn-ghost text-sm"
          onClick={() => void declineVipInvite(invite.duelId).then(() => fetchVipInvites())}
        >
          {t('vipInvite.decline')}
        </button>
      </div>
    </GlassPanel>
  );
}
