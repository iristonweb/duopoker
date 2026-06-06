import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, GlassPanel, LoadingSkeleton, PageShell, SectionHeader } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  nickname: string;
  role: string;
  chips: number;
  emailVerified: boolean;
  createdAt: string;
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
};

type AdminSession = {
  id: string;
  mode: string;
  status: string;
  players: string[];
  buyIn: number;
  startedAt: string | null;
};

type QueueTicket = {
  userId: string;
  mode: string;
  buyIn: number;
  createdAt: string;
  user: { email: string; displayName: string; nickname: string } | null;
};

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <GlassPanel className="border-white/10 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${accent ?? 'text-ivory'}`}>{value}</p>
    </GlassPanel>
  );
}

export function AdminPage() {
  const { t } = useTranslation();
  const userRole = useAppStore((s) => s.userRole);
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const [stats, setStats] = useState<AdminStats>();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [queue, setQueue] = useState<QueueTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || userRole !== 'SUPERADMIN') {
      setLoading(false);
      return;
    }
    void Promise.all([
      apiFetch('/admin/stats'),
      apiFetch('/admin/users?take=30'),
      apiFetch('/admin/sessions'),
      apiFetch('/admin/queue')
    ])
      .then(async ([statsRes, usersRes, sessionsRes, queueRes]) => {
        if (!statsRes.ok || !usersRes.ok) {
          setError(t('admin.forbidden'));
          return;
        }
        const statsData = (await statsRes.json()) as AdminStats;
        const usersData = (await usersRes.json()) as { users: AdminUser[]; total: number };
        setStats(statsData);
        setUsers(usersData.users);
        setTotal(usersData.total);
        if (sessionsRes.ok) {
          const s = (await sessionsRes.json()) as { sessions: AdminSession[] };
          setSessions(s.sessions);
        }
        if (queueRes.ok) {
          const q = (await queueRes.json()) as { tickets: QueueTicket[] };
          setQueue(q.tickets);
        }
      })
      .catch(() => setError(t('admin.forbidden')))
      .finally(() => setLoading(false));
  }, [accessToken, userRole, apiFetch, t]);

  if (userRole !== 'SUPERADMIN') {
    return (
      <PageShell maxWidth="2xl" back={<Link to="/lobby" className="premium-link text-sm">{t('nav.backLobby')}</Link>}>
        <GlassPanel className="border-white/10 p-6 text-muted">{t('admin.forbidden')}</GlassPanel>
      </PageShell>
    );
  }

  return (
    <PageShell
      maxWidth="5xl"
      back={<Link to="/lobby" className="premium-link text-sm">{t('nav.backLobby')}</Link>}
      eyebrow={t('admin.eyebrow')}
      title={t('admin.dashboardTitle')}
      description={t('admin.dashboardDesc', { count: total })}
    >
      {loading ? (
        <GlassPanel className="border-white/10 p-6">
          <LoadingSkeleton lines={8} />
        </GlassPanel>
      ) : error ? (
        <GlassPanel className="border-white/10 p-6 text-rose-300">{error}</GlassPanel>
      ) : (
        <div className="flex flex-col gap-8">
          {stats ? (
            <section>
              <SectionHeader eyebrow={t('admin.statsEyebrow')} title={t('admin.statsTitle')} className="mb-4" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <StatCard label={t('admin.statUsers')} value={stats.totalUsers} />
                <StatCard label={t('admin.statNew24h')} value={stats.newUsers24h} accent="text-emerald" />
                <StatCard label={t('admin.statVerified')} value={stats.verifiedUsers} />
                <StatCard label={t('admin.statSubscriptions')} value={stats.activeSubscriptions} accent="text-gold-light" />
                <StatCard label={t('admin.statActiveSessions')} value={stats.activeSessions} accent="text-emerald" />
                <StatCard label={t('admin.statInProgress')} value={stats.inProgressSessions} />
                <StatCard label={t('admin.statQueue')} value={stats.waitingQueue} accent="text-amber-300" />
                <StatCard label={t('admin.statClubs')} value={stats.totalClubs} />
                <StatCard label={t('admin.statLiveTables')} value={stats.livePrivateTables} />
                <StatCard label={t('admin.statScheduledTables')} value={stats.scheduledPrivateTables} />
                <StatCard label={t('admin.statSuperadmins')} value={stats.superAdmins} accent="text-gold-light" />
              </div>
            </section>
          ) : null}

          <section>
            <SectionHeader eyebrow={t('admin.queueEyebrow')} title={t('admin.queueTitle')} className="mb-4" />
            <GlassPanel className="overflow-hidden border-white/10 p-0">
              {!queue.length ? (
                <p className="p-4 text-sm text-muted">{t('admin.queueEmpty')}</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {queue.map((ticket) => (
                    <li key={ticket.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-zinc-100">
                          {ticket.user?.displayName ?? ticket.userId.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted">
                          {ticket.user?.email ?? '—'} · {ticket.mode} · {ticket.buyIn} chips
                        </p>
                      </div>
                      <Badge variant="gold">{t('admin.inQueue')}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </section>

          <section>
            <SectionHeader eyebrow={t('admin.sessionsEyebrow')} title={t('admin.sessionsTitle')} className="mb-4" />
            <GlassPanel className="overflow-hidden border-white/10 p-0">
              {!sessions.length ? (
                <p className="p-4 text-sm text-muted">{t('admin.sessionsEmpty')}</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div>
                        <p className="font-mono text-xs text-zinc-200">{s.id}</p>
                        <p className="text-xs text-muted">
                          {s.mode} · {s.status} · {s.players.length} {t('admin.players')} · {s.buyIn}
                        </p>
                      </div>
                      <Link to={`/table/${s.id}`} className="premium-link text-xs">
                        {t('admin.openTable')}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>
          </section>

          <section>
            <SectionHeader eyebrow={t('admin.usersEyebrow')} title={t('admin.title')} description={t('admin.total', { count: total })} className="mb-4" />
            <GlassPanel className="overflow-hidden border-white/10 p-0">
              <ul className="divide-y divide-white/5">
                {users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-zinc-100">{u.displayName}</p>
                      <p className="text-xs text-muted">
                        {u.email} · @{u.nickname} · {u.chips.toLocaleString()} {t('admin.chips')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.emailVerified ? (
                        <Badge variant="emerald">{t('admin.verified')}</Badge>
                      ) : (
                        <Badge variant="default">{t('admin.unverified')}</Badge>
                      )}
                      <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold">
                        {u.role}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </section>
        </div>
      )}
    </PageShell>
  );
}
