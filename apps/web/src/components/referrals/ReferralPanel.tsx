import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassPanel, SectionHeader } from '@duopoker/ui-kit';
import { useAppStore } from '../../store/useAppStore';

type Milestone = {
  level: number;
  activeReferralsRequired: number;
  chips: number;
  labelRu: string;
  labelEn: string;
  claimed: boolean;
  claimable: boolean;
};

type ReferralDashboard = {
  code: string;
  pendingReferrals: number;
  activeReferrals: number;
  totalReferrals: number;
  referredBy: { code: string; status: string } | null;
  milestones: Milestone[];
};

export function ReferralPanel() {
  const { t, i18n } = useTranslation();
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const fetchProfile = useAppStore((s) => s.fetchProfile);

  const [data, setData] = useState<ReferralDashboard>();
  const [applyCode, setApplyCode] = useState('');
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    const res = await apiFetch('/referrals/me');
    if (!res.ok) return;
    setData((await res.json()) as ReferralDashboard);
  }, [accessToken, apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!accessToken) return null;

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lobby?ref=${data?.code ?? ''}`
      : '';

  const milestoneLabel = (m: Milestone) => (i18n.language.startsWith('ru') ? m.labelRu : m.labelEn);

  const claim = async (level: number) => {
    setBusy(true);
    setMsg(undefined);
    try {
      const res = await apiFetch(`/referrals/claim/${level}`, { method: 'POST' });
      if (!res.ok) {
        setMsg(t('referral.claimFailed'));
        return;
      }
      setMsg(t('referral.claimOk'));
      await load();
      await fetchProfile();
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!applyCode.trim()) return;
    setBusy(true);
    setMsg(undefined);
    try {
      const res = await apiFetch('/referrals/apply', {
        method: 'POST',
        body: JSON.stringify({ code: applyCode.trim() })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setMsg(t(`referral.errors.${err.error ?? 'unknown'}`, { defaultValue: t('referral.applyFailed') }));
        return;
      }
      setMsg(t('referral.applyOk'));
      setApplyCode('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassPanel className="border-white/10 p-5">
      <SectionHeader
        eyebrow={t('referral.eyebrow')}
        title={t('referral.title')}
        description={t('referral.desc')}
        className="mb-4"
      />

      {data ? (
        <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-lg bg-white/5 px-2 py-3">
            <p className="text-[10px] uppercase tracking-wider text-subtle">{t('referral.active')}</p>
            <p className="font-display text-xl font-semibold text-gold-light">{data.activeReferrals}</p>
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-3">
            <p className="text-[10px] uppercase tracking-wider text-subtle">{t('referral.pending')}</p>
            <p className="font-display text-xl font-semibold text-ivory">{data.pendingReferrals}</p>
          </div>
          <div className="rounded-lg bg-white/5 px-2 py-3">
            <p className="text-[10px] uppercase tracking-wider text-subtle">{t('referral.total')}</p>
            <p className="font-display text-xl font-semibold text-ivory">{data.totalReferrals}</p>
          </div>
        </div>
      ) : null}

      <div className="mb-4">
        <p className="mb-1 text-xs text-subtle">{t('referral.yourCode')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-gold/10 px-3 py-2 font-mono text-lg font-semibold text-gold-light">
            {data?.code ?? '…'}
          </code>
          <button
            type="button"
            className="premium-btn premium-btn-ghost text-xs"
            onClick={() => void navigator.clipboard.writeText(shareUrl)}
          >
            {t('referral.copyLink')}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">{t('referral.activeRule')}</p>
      </div>

      {!data?.referredBy ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="premium-input min-w-[140px] flex-1 text-sm"
            placeholder={t('referral.applyPlaceholder')}
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
          />
          <button type="button" disabled={busy} className="premium-btn premium-btn-ghost text-sm" onClick={() => void apply()}>
            {t('referral.apply')}
          </button>
        </div>
      ) : (
        <p className="mb-4 text-xs text-muted">
          {t('referral.referredBy', { code: data.referredBy.code, status: data.referredBy.status })}
        </p>
      )}

      <ul className="space-y-2">
        {(data?.milestones ?? []).map((m) => (
          <li
            key={m.level}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
          >
            <span className="text-ivory">{milestoneLabel(m)}</span>
            {m.claimed ? (
              <span className="text-xs text-emerald-300">{t('referral.claimed')}</span>
            ) : m.claimable ? (
              <button
                type="button"
                disabled={busy}
                className="premium-btn premium-btn-primary text-xs"
                onClick={() => void claim(m.level)}
              >
                {t('referral.claim')}
              </button>
            ) : (
              <span className="text-xs text-muted">{t('referral.needMore', { n: m.activeReferralsRequired })}</span>
            )}
          </li>
        ))}
      </ul>

      {msg ? <p className="mt-3 text-xs text-gold-light">{msg}</p> : null}
    </GlassPanel>
  );
}
