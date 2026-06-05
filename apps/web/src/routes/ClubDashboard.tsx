import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  GlassPanel,
  Input,
  LoadingSkeleton,
  OrganizerPlanCard,
  PageShell,
  SectionHeader
} from '@duopoker/ui-kit';
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
  const [loading, setLoading] = useState(true);
  const [memberQuery, setMemberQuery] = useState('');
  const [tableName, setTableName] = useState('');
  const [msg, setMsg] = useState<string>();

  const reload = () => {
    if (!clubId) return;
    setLoading(true);
    void fetchClub(clubId)
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(reload, [clubId, fetchClub]);

  if (!clubId) return null;
  const club = data?.club;
  const tier = club?.organizerPlan?.tier ?? 'BASIC';
  const limits = club?.limits ?? { maxMembers: 30, maxActiveTables: 2 };

  return (
    <PageShell
      maxWidth="4xl"
      back={
        <Link to="/clubs" className="premium-link text-sm">
          ← Клубы
        </Link>
      }
    >
      {loading && !club ? (
        <GlassPanel className="border-white/10 p-8">
          <LoadingSkeleton lines={5} />
        </GlassPanel>
      ) : club ? (
        <>
          <div className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">Club dashboard</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ivory">{club.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="gold">{tier}</Badge>
              <Badge>
                {club.usage?.members ?? 0}/{limits.maxMembers} members
              </Badge>
              <Badge variant="emerald">
                {club.usage?.activeTables ?? 0}/{limits.maxActiveTables} tables
              </Badge>
            </div>
          </div>

          {tier === 'BASIC' ? (
            <section className="mb-10">
              <SectionHeader
                eyebrow="Upgrade"
                title="Organizer plans"
                description="Расширьте лимиты участников и активных столов."
              />
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>
            </section>
          ) : null}

          <GlassPanel className="mb-6 border-white/10 p-5">
            <SectionHeader eyebrow="People" title="Участники" className="mb-4" />
            <ul className="space-y-2">
              {club.members?.map((m) => (
                <li
                  key={m.user.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">@{m.user.nickname}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">{m.role}</span>
                </li>
              ))}
            </ul>
            {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  className="flex-1"
                  placeholder="@nickname или user id"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
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

          <GlassPanel className="border-white/10 p-5">
            <SectionHeader eyebrow="Tables" title="Приватные столы" className="mb-4" />
            {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  className="flex-1"
                  placeholder="Название стола"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="shrink-0"
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

          {msg ? (
            <p className="mt-4 rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-sm text-emerald">
              {msg}
            </p>
          ) : null}
        </>
      ) : (
        <GlassPanel className="border-white/10 p-6 text-muted">Клуб не найден.</GlassPanel>
      )}
    </PageShell>
  );
};
