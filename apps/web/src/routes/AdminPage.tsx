import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PaidSubscriptionTier } from '@duopoker/shared-types';
import { tierLabel } from '@duopoker/shared-types';
import {
  Badge,
  Button,
  GlassPanel,
  Input,
  LoadingSkeleton,
  PageShell,
  SectionHeader,
  Textarea
} from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

const PAID_TIERS: PaidSubscriptionTier[] = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'BLACK'
];
const ORGANIZER_TIERS = ['BASIC', 'PRO', 'NETWORK'] as const;
const selectClassName =
  'rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-zinc-100 shadow-inner transition-[border-color,box-shadow,background-color] duration-200 hover:border-white/15 hover:bg-black/50 focus:border-gold/35 focus:bg-black/55 focus:shadow-[0_0_0_3px_rgba(232,197,71,0.12)] disabled:cursor-not-allowed disabled:opacity-50';

type Tab = 'overview' | 'players' | 'vip' | 'compliance';

type ComplianceEvent = {
  id: string;
  type: string;
  severity: string;
  createdAt: string;
  resolvedAt?: string | null;
  club?: { id: string; name: string } | null;
};

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  nickname: string;
  role: string;
  chips: number;
  level?: number;
  xp?: number;
  emailVerified: boolean;
  createdAt: string;
  subscriptionTier?: string | null;
};

type AdminUserDetail = AdminUser & {
  subscription: { tier: string; expiresAt: string; status: string } | null;
  inventory: { itemId: string; equipped: boolean; rarity: string }[];
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    inQueue: boolean;
    matchAssignment: string | null;
    clubMemberships: number;
  };
  clubsOwned: Array<{
    id: string;
    name: string;
    organizerTier: string;
    members: number;
    activeTables: number;
    limits: { maxMembers: number; maxActiveTables: number };
  }>;
};

type AdminStats = {
  totalUsers: number;
  superAdmins: number;
  verifiedUsers: number;
  newUsers24h: number;
  activeSubscriptions: number;
  activeSessions: number;
  inProgressSessions: number;
  waitingQueue: number;
  totalClubs: number;
  livePrivateTables: number;
  scheduledPrivateTables: number;
  pendingVipTables?: number;
  billing?: {
    failedPayments24h: number;
    organizerPlansActive: number;
    organizerPlansPastDue: number;
  };
  compliance?: { unresolvedHigh: number };
};

type QueueTicket = {
  userId: string;
  mode: string;
  buyIn: number;
  createdAt: string;
  user: { email: string; displayName: string; nickname: string } | null;
};

type VipDuel = {
  id: string;
  mode: string;
  buyIn: number;
  status: string;
  message: string | null;
  sessionId: string | null;
  invites: Array<{
    userId: string;
    status: string;
    user: { nickname: string; displayName: string };
  }>;
};

function StatCard({
  label,
  value,
  accent
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  const glow = accent?.includes('emerald')
    ? 'emerald'
    : accent?.includes('gold') || accent?.includes('amber')
      ? 'gold'
      : 'none';
  return (
    <GlassPanel glow={glow} className="border-white/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-semibold tabular-nums ${accent ?? 'text-ivory'}`}
      >
        {value}
      </p>
    </GlassPanel>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userRole = useAppStore((s) => s.userRole);
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const userId = useAppStore((s) => s.userId);
  const fetchProfile = useAppStore((s) => s.fetchProfile);
  const joinSession = useAppStore((s) => s.joinSession);

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [queue, setQueue] = useState<QueueTicket[]>([]);
  const [vipDuels, setVipDuels] = useState<VipDuel[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminUserDetail | null>(null);
  const [vipNicknames, setVipNicknames] = useState('');
  const [vipMessage, setVipMessage] = useState('');
  const [vipBuyIn, setVipBuyIn] = useState(1000);
  const [actionMsg, setActionMsg] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [grantTier, setGrantTier] = useState<PaidSubscriptionTier>('BLACK');
  const [grantLifetime, setGrantLifetime] = useState(true);
  const [grantChips, setGrantChips] = useState(999_999);
  const [clubPlanTier, setClubPlanTier] = useState<(typeof ORGANIZER_TIERS)[number]>('PRO');
  const [clubPlanLifetime, setClubPlanLifetime] = useState(false);
  const [complianceEvents, setComplianceEvents] = useState<ComplianceEvent[]>([]);

  const loadCore = useCallback(
    async (query: string) => {
      const [statsRes, usersRes, queueRes, vipRes, complianceRes] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch(`/admin/users?take=40${query ? `&q=${encodeURIComponent(query)}` : ''}`),
        apiFetch('/admin/queue'),
        apiFetch('/admin/vip-tables'),
        apiFetch('/admin/compliance-events?unresolved=true&take=50')
      ]);
      if (!statsRes.ok || !usersRes.ok) {
        const failed = !statsRes.ok ? statsRes : usersRes;
        if (failed.status === 401) throw new Error('unauthorized');
        if (failed.status === 403) throw new Error('forbidden');
        throw new Error('server');
      }
      setStats((await statsRes.json()) as AdminStats);
      const usersData = (await usersRes.json()) as { users: AdminUser[]; total: number };
      setUsers(usersData.users);
      setTotal(usersData.total);
      if (queueRes.ok) {
        setQueue(((await queueRes.json()) as { tickets: QueueTicket[] }).tickets);
      }
      if (vipRes.ok) {
        setVipDuels(((await vipRes.json()) as { duels: VipDuel[] }).duels);
      }
      if (complianceRes.ok) {
        setComplianceEvents(((await complianceRes.json()) as { events: ComplianceEvent[] }).events);
      }
    },
    [apiFetch]
  );

  const handleLoadError = useCallback(
    (err: Error) => {
      if (err.message === 'unauthorized') setError(t('admin.sessionExpired'));
      else if (err.message === 'forbidden') setError(t('admin.forbidden'));
      else setError(t('admin.loadFailed'));
    },
    [t]
  );

  useEffect(() => {
    if (!accessToken) {
      setProfileReady(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setProfileReady(false);
    void fetchProfile().finally(() => {
      if (!cancelled) setProfileReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, fetchProfile]);

  useEffect(() => {
    if (!profileReady) return;
    if (!accessToken || userRole !== 'SUPERADMIN') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    void loadCore('')
      .catch((err: Error) => {
        if (!cancelled) handleLoadError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileReady, accessToken, userRole, loadCore, handleLoadError]);

  const openUser = async (id: string) => {
    setBusy(true);
    setActionMsg(undefined);
    try {
      const res = await apiFetch(`/admin/users/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { user: AdminUserDetail };
      setSelected(data.user);
      setTab('players');
    } finally {
      setBusy(false);
    }
  };

  const grantClubPlan = async (clubId: string) => {
    setBusy(true);
    setActionMsg(undefined);
    try {
      const res = await apiFetch(`/admin/clubs/${clubId}/plan`, {
        method: 'POST',
        body: JSON.stringify({ tier: clubPlanTier, lifetime: clubPlanLifetime })
      });
      if (!res.ok) {
        setActionMsg(t('admin.actionFailed'));
        return;
      }
      setActionMsg(t('admin.clubPlanOk'));
      if (selected) await openUser(selected.id);
    } finally {
      setBusy(false);
    }
  };

  const revokeClubPlan = async (clubId: string) => {
    setBusy(true);
    setActionMsg(undefined);
    try {
      const res = await apiFetch(`/admin/clubs/${clubId}/plan/revoke`, { method: 'POST' });
      if (!res.ok) {
        setActionMsg(t('admin.actionFailed'));
        return;
      }
      setActionMsg(t('admin.clubPlanRevoked'));
      if (selected) await openUser(selected.id);
    } finally {
      setBusy(false);
    }
  };

  const grantAction = async (path: string, body: object) => {
    if (!selected) return;
    setBusy(true);
    setActionMsg(undefined);
    try {
      const res = await apiFetch(`/admin/users/${selected.id}${path}`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        setActionMsg(t('admin.actionFailed'));
        return;
      }
      setActionMsg(t('admin.actionOk'));
      await openUser(selected.id);
      await loadCore(search);
    } finally {
      setBusy(false);
    }
  };

  const createVipTable = async () => {
    const nicknames = vipNicknames
      .split(/[\s,]+/)
      .map((n) => n.replace(/^@/, '').trim())
      .filter(Boolean);
    if (!nicknames.length) return;
    setBusy(true);
    setActionMsg(undefined);
    try {
      const res = await apiFetch('/admin/vip-tables', {
        method: 'POST',
        body: JSON.stringify({
          nicknames,
          buyIn: vipBuyIn,
          mode: 'HOLDEM',
          message: vipMessage || undefined
        })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; missing?: string[] };
        setActionMsg(
          err.missing?.length
            ? t('admin.vipNotFound', { list: err.missing.join(', ') })
            : t('admin.actionFailed')
        );
        return;
      }
      setVipNicknames('');
      setVipMessage('');
      setActionMsg(t('admin.vipCreated'));
      setTab('vip');
      await loadCore(search);
    } finally {
      setBusy(false);
    }
  };

  const startVip = async (duelId: string) => {
    setBusy(true);
    try {
      const res = await apiFetch(`/admin/vip-tables/${duelId}/start`, { method: 'POST' });
      if (!res.ok) {
        setActionMsg(t('admin.actionFailed'));
        return;
      }
      const data = (await res.json()) as { sessionId: string };
      useAppStore.getState().resetTableJoin();
      await joinSession(data.sessionId, 'HOLDEM', vipBuyIn);
      navigate(`/table/${data.sessionId}`);
    } finally {
      setBusy(false);
    }
  };

  if (!accessToken || (!loading && userRole !== 'SUPERADMIN')) {
    return (
      <PageShell
        maxWidth="2xl"
        back={
          <Link to="/lobby" className="premium-link text-sm">
            {t('nav.backLobby')}
          </Link>
        }
      >
        <GlassPanel className="border-white/10 p-6 text-muted">
          {!accessToken ? t('auth.signInRequired') : t('admin.forbidden')}
        </GlassPanel>
      </PageShell>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('admin.tabOverview') },
    { id: 'players', label: t('admin.tabPlayers') },
    { id: 'vip', label: t('admin.tabVip') },
    { id: 'compliance', label: 'Compliance' }
  ];

  const resolveCompliance = async (id: string) => {
    await apiFetch(`/admin/compliance-events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true })
    });
    void loadCore(search);
  };

  return (
    <PageShell
      maxWidth="5xl"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          {t('nav.backLobby')}
        </Link>
      }
      eyebrow={t('admin.eyebrow')}
      title={t('admin.dashboardTitle')}
      description={t('admin.dashboardDesc', { count: total })}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? 'bg-gold/20 text-gold-light ring-1 ring-gold/40'
                : 'bg-white/5 text-muted hover:text-ivory'
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {actionMsg ? (
        <GlassPanel className="mb-4 border-emerald-500/30 p-3 text-sm text-emerald-200">
          {actionMsg}
        </GlassPanel>
      ) : null}

      {loading ? (
        <GlassPanel className="border-white/10 p-6">
          <LoadingSkeleton lines={8} />
        </GlassPanel>
      ) : error ? (
        <GlassPanel className="border-white/10 p-6 text-rose-300">{error}</GlassPanel>
      ) : tab === 'overview' ? (
        <div className="flex flex-col gap-8">
          {stats ? (
            <section>
              <SectionHeader
                eyebrow={t('admin.statsEyebrow')}
                title={t('admin.statsTitle')}
                className="mb-4"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label={t('admin.statUsers')} value={stats.totalUsers} />
                <StatCard
                  label={t('admin.statNew24h')}
                  value={stats.newUsers24h}
                  accent="text-emerald"
                />
                <StatCard
                  label={t('admin.statSubscriptions')}
                  value={stats.activeSubscriptions}
                  accent="text-gold-light"
                />
                <StatCard
                  label={t('admin.statQueue')}
                  value={stats.waitingQueue}
                  accent="text-amber-300"
                />
                <StatCard
                  label={t('admin.statActiveSessions')}
                  value={stats.activeSessions}
                  accent="text-emerald"
                />
                <StatCard
                  label={t('admin.statVipPending')}
                  value={stats.pendingVipTables ?? 0}
                  accent="text-gold-light"
                />
                <StatCard label="Clubs" value={stats.totalClubs} />
                <StatCard
                  label="Live tables"
                  value={stats.livePrivateTables}
                  accent="text-emerald"
                />
                <StatCard
                  label="Failed payments (24h)"
                  value={stats.billing?.failedPayments24h ?? 0}
                  accent="text-rose-300"
                />
                <StatCard
                  label="Organizer plans"
                  value={stats.billing?.organizerPlansActive ?? 0}
                  accent="text-gold-light"
                />
                <StatCard
                  label="Past due clubs"
                  value={stats.billing?.organizerPlansPastDue ?? 0}
                  accent="text-amber-300"
                />
                <StatCard
                  label="Open compliance (HIGH)"
                  value={stats.compliance?.unresolvedHigh ?? 0}
                  accent="text-rose-300"
                />
              </div>
            </section>
          ) : null}
          <section>
            <SectionHeader
              eyebrow={t('admin.queueEyebrow')}
              title={t('admin.queueTitle')}
              className="mb-4"
            />
            <GlassPanel className="overflow-hidden border-white/10 p-0">
              {!queue.length ? (
                <p className="px-4 py-8 text-center text-muted">{t('admin.queueEmpty')}</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {queue.map((ticket) => (
                    <li
                      key={ticket.userId}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">
                          {ticket.user?.displayName ?? ticket.userId.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted">
                          @{ticket.user?.nickname} · {ticket.mode}
                        </p>
                      </div>
                      <Badge variant="gold">{t('admin.inQueue')}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </section>
        </div>
      ) : tab === 'players' ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <GlassPanel className="border-white/10 p-4">
              <Input
                className="mb-3"
                placeholder={t('admin.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void loadCore(search).catch(handleLoadError)}
              />
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="mb-4 w-full"
                onClick={() => void loadCore(search).catch(handleLoadError)}
              >
                {t('admin.search')}
              </Button>
              <ul className="max-h-[480px] divide-y divide-white/5 overflow-y-auto">
                {users.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className={`w-full px-2 py-3 text-left text-sm transition hover:bg-white/5 ${selected?.id === u.id ? 'bg-gold/10' : ''}`}
                      onClick={() => void openUser(u.id)}
                    >
                      <p className="font-medium text-ivory">{u.displayName}</p>
                      <p className="text-xs text-muted">
                        @{u.nickname} · {u.subscriptionTier ?? 'FREE'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </div>
          <div className="lg:col-span-3">
            {selected ? (
              <GlassPanel className="border-white/10 p-5">
                <SectionHeader
                  title={selected.displayName}
                  description={`@${selected.nickname} · ${selected.email}`}
                />
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-subtle">{t('admin.chips')}</span>
                    <p className="font-semibold">{selected.chips.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.level')}</span>
                    <p className="font-semibold">
                      {selected.level} · {selected.xp} XP
                    </p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.subscription')}</span>
                    <p className="font-semibold">{selected.subscription?.tier ?? 'FREE'}</p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.gamesPlayed')}</span>
                    <p className="font-semibold">{selected.stats.gamesPlayed}</p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.gamesWon')}</span>
                    <p className="font-semibold text-emerald">{selected.stats.gamesWon}</p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.gamesLost')}</span>
                    <p className="font-semibold">{selected.stats.gamesLost}</p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.role')}</span>
                    <p className="font-semibold">{selected.role}</p>
                  </div>
                  <div>
                    <span className="text-subtle">{t('admin.inventory')}</span>
                    <p className="font-semibold">
                      {selected.inventory.length} {t('admin.items')}
                    </p>
                  </div>
                </div>
                <section className="mt-6 space-y-3 border-t border-white/10 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">
                    {t('admin.grantSubscription')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className={selectClassName}
                      value={grantTier}
                      onChange={(e) => setGrantTier(e.target.value as PaidSubscriptionTier)}
                    >
                      {PAID_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tierLabel[tier]}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={grantLifetime}
                        onChange={(e) => setGrantLifetime(e.target.checked)}
                      />
                      {t('admin.lifetime')}
                    </label>
                    <Button
                      type="button"
                      disabled={busy}
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        void grantAction('/subscription', {
                          tier: grantTier,
                          lifetime: grantLifetime
                        })
                      }
                    >
                      {t('admin.grantSub')}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      onClick={() => void grantAction('/subscription/revoke', {})}
                    >
                      {t('admin.revokeSub')}
                    </Button>
                  </div>
                </section>
                <section className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">
                    {t('admin.grantExtras')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      className="w-32 text-sm"
                      value={grantChips}
                      onChange={(e) => setGrantChips(Number(e.target.value))}
                    />
                    <Button
                      type="button"
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      onClick={() => void grantAction('/chips', { chips: grantChips })}
                    >
                      {t('admin.grantChips')}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      onClick={() => void grantAction('/cosmetics', { grantAll: true })}
                    >
                      {t('admin.grantCosmetics')}
                    </Button>
                    <Button
                      type="button"
                      disabled={busy}
                      variant="ghost"
                      size="sm"
                      onClick={() => void grantAction('/cosmetics/tier', { tier: grantTier })}
                    >
                      {t('admin.grantTierCosmetics')}
                    </Button>
                    {selected.role !== 'SUPERADMIN' ? (
                      <Button
                        type="button"
                        disabled={busy}
                        variant="ghost"
                        size="sm"
                        onClick={() => void grantAction('/role', { role: 'SUPERADMIN' })}
                      >
                        {t('admin.makeAdmin')}
                      </Button>
                    ) : selected.id !== userId ? (
                      <Button
                        type="button"
                        disabled={busy}
                        variant="ghost"
                        size="sm"
                        onClick={() => void grantAction('/role', { role: 'USER' })}
                      >
                        {t('admin.demoteAdmin')}
                      </Button>
                    ) : null}
                  </div>
                </section>
                {selected.clubsOwned?.length ? (
                  <section className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">
                      {t('admin.clubsOwned')}
                    </p>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <select
                        className={selectClassName}
                        value={clubPlanTier}
                        onChange={(e) =>
                          setClubPlanTier(e.target.value as (typeof ORGANIZER_TIERS)[number])
                        }
                      >
                        {ORGANIZER_TIERS.map((tier) => (
                          <option key={tier} value={tier}>
                            {tier}
                          </option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={clubPlanLifetime}
                          onChange={(e) => setClubPlanLifetime(e.target.checked)}
                        />
                        {t('admin.lifetime')}
                      </label>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {selected.clubsOwned.map((club) => (
                        <li
                          key={club.id}
                          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-medium text-ivory">{club.name}</p>
                              <p className="text-xs text-muted">
                                {club.organizerTier} · {club.members}/{club.limits.maxMembers}{' '}
                                {t('admin.members')} · {club.activeTables}/
                                {club.limits.maxActiveTables} {t('admin.tables')}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                disabled={busy}
                                variant="ghost"
                                size="sm"
                                onClick={() => void grantClubPlan(club.id)}
                              >
                                {t('admin.applyClubPlan')}
                              </Button>
                              {club.organizerTier !== 'BASIC' ? (
                                <Button
                                  type="button"
                                  disabled={busy}
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void revokeClubPlan(club.id)}
                                >
                                  {t('admin.revokeClubPlan')}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </GlassPanel>
            ) : (
              <GlassPanel className="border-white/10 p-8 text-center text-muted">
                {t('admin.selectPlayer')}
              </GlassPanel>
            )}
          </div>
        </div>
      ) : tab === 'compliance' ? (
        <GlassPanel className="border-white/10 p-0">
          <div className="border-b border-white/5 px-4 py-3">
            <p className="font-display font-semibold text-ivory">Moderation queue</p>
            <p className="text-xs text-muted">Unresolved compliance events</p>
          </div>
          {!complianceEvents.length ? (
            <p className="px-4 py-8 text-center text-muted">No open reports</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {complianceEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <Badge variant={ev.severity === 'HIGH' ? 'rose' : 'default'}>
                      {ev.severity}
                    </Badge>
                    <span className="ml-2 text-ivory">{ev.type}</span>
                    <p className="text-xs text-muted">
                      {ev.club?.name ?? 'Platform'} · {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void resolveCompliance(ev.id)}
                  >
                    Resolve
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel className="border-white/10 p-5">
            <SectionHeader
              eyebrow={t('admin.vipEyebrow')}
              title={t('admin.vipTitle')}
              description={t('admin.vipDesc')}
              className="mb-4"
            />
            <label className="mb-2 block text-xs text-subtle">{t('admin.vipNicknames')}</label>
            <Textarea
              className="mb-3 min-h-[80px]"
              placeholder="@player1, @player2"
              value={vipNicknames}
              onChange={(e) => setVipNicknames(e.target.value)}
            />
            <label className="mb-2 block text-xs text-subtle">{t('admin.vipMessage')}</label>
            <Input
              className="mb-3"
              value={vipMessage}
              onChange={(e) => setVipMessage(e.target.value)}
            />
            <label className="mb-2 block text-xs text-subtle">{t('admin.vipBuyIn')}</label>
            <Input
              type="number"
              className="mb-4"
              value={vipBuyIn}
              onChange={(e) => setVipBuyIn(Number(e.target.value))}
            />
            <Button
              type="button"
              disabled={busy}
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => void createVipTable()}
            >
              {t('admin.vipSend')}
            </Button>
          </GlassPanel>
          <GlassPanel className="border-white/10 p-0">
            <div className="border-b border-white/5 px-4 py-3">
              <p className="font-display font-semibold text-ivory">{t('admin.vipActive')}</p>
            </div>
            {!vipDuels.length ? (
              <p className="px-4 py-8 text-center text-muted">{t('admin.vipEmpty')}</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {vipDuels.map((duel) => {
                  const accepted = duel.invites.filter((i) => i.status === 'ACCEPTED').length;
                  return (
                    <li key={duel.id} className="px-4 py-4 text-sm">
                      <p className="font-medium text-ivory">
                        {duel.mode} · {duel.buyIn} · {duel.status}
                      </p>
                      <p className="text-xs text-muted">
                        {accepted}/{duel.invites.length} {t('admin.vipAccepted')}
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-subtle">
                        {duel.invites.map((i) => (
                          <li key={i.userId}>
                            @{i.user.nickname} — {i.status}
                          </li>
                        ))}
                      </ul>
                      {duel.status === 'PENDING' ? (
                        <Button
                          type="button"
                          disabled={busy || accepted < 2}
                          variant="primary"
                          size="sm"
                          className="mt-3"
                          onClick={() => void startVip(duel.id)}
                        >
                          {t('admin.vipStart')}
                        </Button>
                      ) : duel.sessionId ? (
                        <Link
                          to={`/table/${duel.sessionId}`}
                          className="premium-link mt-3 inline-block text-xs"
                        >
                          {t('admin.openTable')}
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassPanel>
        </div>
      )}
    </PageShell>
  );
}
