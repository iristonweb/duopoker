import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppBackground, Button, GlassPanel, OrganizerPlanCard } from '@duopoker/ui-kit';
import { organizerPlanBanners } from '@duopoker/shared-types';
import { useAppStore, type ClubDetail } from '../store/useAppStore';

export const ClubDashboard = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const fetchClub = useAppStore((s) => s.fetchClub);
  const addClubMember = useAppStore((s) => s.addClubMember);
  const upgradeClubPlan = useAppStore((s) => s.upgradeClubPlan);
  const createPrivateTable = useAppStore((s) => s.createPrivateTable);
  const navigate = useNavigate();
  const [data, setData] = useState<ClubDetail | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [tableName, setTableName] = useState('');
  const [msg, setMsg] = useState<string>();

  const reload = () => {
    if (!clubId) return;
    void fetchClub(clubId).then(setData);
  };

  useEffect(reload, [clubId, fetchClub]);

  if (!clubId) return null;
  const club = data?.club;
  const tier = club?.organizerPlan?.tier ?? 'BASIC';
  const limits = club?.limits ?? { maxMembers: 30, maxActiveTables: 2 };

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10">
        <Link to="/clubs" className="text-sm text-gold hover:underline">
          ← Клубы
        </Link>
        {club ? (
          <>
            <h1 className="mt-4 text-2xl font-bold text-zinc-100">{club.name}</h1>
            <p className="text-sm text-muted">
              План {tier} · {club.usage?.members ?? 0}/{limits.maxMembers} участников ·{' '}
              {club.usage?.activeTables ?? 0}/{limits.maxActiveTables} столов
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {tier === 'BASIC' ? (
                <>
                  <OrganizerPlanCard tier="PRO" price="2 990 ₽/мес" bannerUrl={organizerPlanBanners.PRO}>
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => void upgradeClubPlan(clubId, 'PRO')}>
                      Оплатить PRO (ЮMoney)
                    </Button>
                  </OrganizerPlanCard>
                  <OrganizerPlanCard tier="NETWORK" price="7 990 ₽/мес" bannerUrl={organizerPlanBanners.NETWORK}>
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => void upgradeClubPlan(clubId, 'NETWORK')}>
                      Оплатить NETWORK
                    </Button>
                  </OrganizerPlanCard>
                </>
              ) : null}
            </div>

            <GlassPanel className="mt-8 border-white/10 p-5">
              <h2 className="font-semibold text-zinc-100">Участники</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {club.members?.map((m) => (
                  <li key={m.user.id} className="text-muted">
                    @{m.user.nickname} · {m.role}
                  </li>
                ))}
              </ul>
              {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && (
                <div className="mt-4 flex gap-2">
                  <input
                    placeholder="@nickname или user id"
                    className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-zinc-100"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void addClubMember(clubId, memberQuery).then(() => {
                        setMemberQuery('');
                        reload();
                        setMsg('Участник добавлен');
                      });
                    }}
                  >
                    Добавить
                  </Button>
                </div>
              )}
            </GlassPanel>

            <GlassPanel className="mt-6 border-white/10 p-5">
              <h2 className="font-semibold text-zinc-100">Приватные столы</h2>
              {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && (
                <div className="mt-4 flex gap-2">
                  <input
                    placeholder="Название стола"
                    className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      void createPrivateTable(clubId, { name: tableName, mode: 'HOLDEM' }).then(({ table }) => {
                        navigate(`/clubs/${clubId}/tables/${table.id}`);
                      });
                    }}
                  >
                    Создать
                  </Button>
                </div>
              )}
            </GlassPanel>
            {msg ? <p className="mt-4 text-sm text-emerald/90">{msg}</p> : null}
          </>
        ) : (
          <p className="mt-8 text-muted">Загрузка…</p>
        )}
      </div>
    </div>
  );
};
