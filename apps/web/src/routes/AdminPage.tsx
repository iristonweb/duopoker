import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GlassPanel, LoadingSkeleton, PageShell } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  nickname: string;
  role: string;
  chips: number;
  createdAt: string;
};

export function AdminPage() {
  const { t } = useTranslation();
  const userRole = useAppStore((s) => s.userRole);
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken || userRole !== 'SUPERADMIN') {
      setLoading(false);
      return;
    }
    void apiFetch('/admin/users')
      .then(async (res) => {
        if (!res.ok) {
          setError(t('admin.forbidden'));
          return;
        }
        const data = (await res.json()) as { users: AdminUser[]; total: number };
        setUsers(data.users);
        setTotal(data.total);
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
      maxWidth="4xl"
      back={<Link to="/lobby" className="premium-link text-sm">{t('nav.backLobby')}</Link>}
      eyebrow="Superadmin"
      title={t('admin.title')}
      description={t('admin.total', { count: total })}
    >
      {loading ? (
        <GlassPanel className="border-white/10 p-6">
          <LoadingSkeleton lines={5} />
        </GlassPanel>
      ) : error ? (
        <GlassPanel className="border-white/10 p-6 text-rose-300">{error}</GlassPanel>
      ) : (
        <GlassPanel className="overflow-hidden border-white/10 p-0">
          <ul className="divide-y divide-white/5">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-100">{u.displayName}</p>
                  <p className="text-xs text-muted">{u.email} · @{u.nickname}</p>
                </div>
                <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold">
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </PageShell>
  );
}
