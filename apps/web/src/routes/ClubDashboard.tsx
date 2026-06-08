import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  GlassPanel,
  Input,
  LoadingSkeleton,
  LegalDisclaimer,
  OrganizerPlanCard,
  PageShell,
  SectionHeader
} from '@duopoker/ui-kit';
import { ORGANIZER_PLAN_PRICES_RUB, organizerPlanBanners } from '@duopoker/shared-types';
import { useAppStore, type ClubDetail, type PrivateTableSummary } from '../store/useAppStore';

type ClubWithMeta = ClubDetail['club'] & {
  planDowngraded?: boolean;
  effectiveTier?: string;
};

const formatPlanPrice = (rub: number) =>
  rub === 0 ? '0 ₽' : `${rub.toLocaleString('ru-RU')} ₽/мес`;

export const ClubDashboard = () => {
  const { t } = useTranslation();
  const { clubId } = useParams<{ clubId: string }>();
  const fetchClub = useAppStore((s) => s.fetchClub);
  const addClubMember = useAppStore((s) => s.addClubMember);
  const upgradeClubPlan = useAppStore((s) => s.upgradeClubPlan);
  const createPrivateTable = useAppStore((s) => s.createPrivateTable);
  const fetchPrivateTables = useAppStore((s) => s.fetchPrivateTables);
  const navigate = useNavigate();
  const [data, setData] = useState<ClubDetail | null>(null);
  const [tables, setTables] = useState<PrivateTableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberQuery, setMemberQuery] = useState('');
  const [tableName, setTableName] = useState('');
  const [tableMode, setTableMode] = useState<'HOLDEM' | 'JOKER'>('HOLDEM');
  const [msg, setMsg] = useState<string>();

  const reload = () => {
    if (!clubId) return;
    setLoading(true);
    void fetchClub(clubId)
      .then(setData)
      .then(() => fetchPrivateTables(clubId))
      .then(setTables)
      .catch(() => setTables([]))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [clubId, fetchClub]);

  if (!clubId) return null;
  const apiFetch = useAppStore((s) => s.apiFetch);
  const club = data?.club as ClubWithMeta | undefined;
  const tier = club?.effectiveTier ?? club?.organizerPlan?.tier ?? 'BASIC';
  const limits = club?.limits ?? { maxMembers: 30, maxActiveTables: 2 };
  const memberPct = limits.maxMembers
    ? Math.min(100, Math.round(((club?.usage?.members ?? 0) / limits.maxMembers) * 100))
    : 0;
  const tablePct = limits.maxActiveTables
    ? Math.min(100, Math.round(((club?.usage?.activeTables ?? 0) / limits.maxActiveTables) * 100))
    : 0;
  const readOnly = Boolean(club?.planDowngraded);

  return (
    <PageShell
      maxWidth="4xl"
      back={
        <Link to="/clubs" className="premium-link text-sm">
          {t('clubs.back')}
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">{t('clubs.eyebrow')}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ivory">{club.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="gold">{tier}</Badge>
              <Badge>
                {club.usage?.members ?? 0}/{limits.maxMembers} {t('clubs.members')}
              </Badge>
              <Badge variant="emerald">
                {club.usage?.activeTables ?? 0}/{limits.maxActiveTables} tables
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted">{t('clubs.disclaimer')}</p>
            <div className="mt-4 space-y-2">
              <div>
                <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-subtle">
                  <span>Members</span>
                  <span>
                    {club.usage?.members ?? 0}/{limits.maxMembers}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-gold/80" style={{ width: `${memberPct}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-subtle">
                  <span>Active tables</span>
                  <span>
                    {club.usage?.activeTables ?? 0}/{limits.maxActiveTables}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-emerald/80" style={{ width: `${tablePct}%` }} />
                </div>
              </div>
            </div>
            <Link to="/legal/organizer" className="premium-link mt-2 inline-block text-xs">
              Organizer policy
            </Link>
          </div>

          {readOnly ? (
            <GlassPanel className="mb-6 border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Your paid plan expired — club is read-only at Basic limits. Renew to create tables and
              add members beyond limits.
            </GlassPanel>
          ) : null}

          {tier === 'BASIC' ? (
            <section className="mb-10">
              <SectionHeader
                eyebrow="Upgrade"
                title={t('clubs.plansTitle')}
                description={t('clubs.plansDesc')}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <OrganizerPlanCard
                  tier="BASIC"
                  price={formatPlanPrice(0)}
                  description={t('clubs.planBasic.desc')}
                  bannerUrl={organizerPlanBanners.BASIC}
                />
                <OrganizerPlanCard
                  tier="PRO"
                  price={formatPlanPrice(ORGANIZER_PLAN_PRICES_RUB.PRO)}
                  description={t('clubs.planPro.desc')}
                  bannerUrl={organizerPlanBanners.PRO}
                >
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => void upgradeClubPlan(clubId, 'PRO')}>
                    {t('clubs.payPro')}
                  </Button>
                </OrganizerPlanCard>
                <OrganizerPlanCard
                  tier="NETWORK"
                  price={formatPlanPrice(ORGANIZER_PLAN_PRICES_RUB.NETWORK)}
                  description={t('clubs.planNetwork.desc')}
                  bannerUrl={organizerPlanBanners.NETWORK}
                >
                  <Button variant="secondary" size="sm" className="w-full" onClick={() => void upgradeClubPlan(clubId, 'NETWORK')}>
                    {t('clubs.payNetwork')}
                  </Button>
                </OrganizerPlanCard>
              </div>
              <LegalDisclaimer className="mt-4" text={t('legal.checkoutNotice')} />
            </section>
          ) : (
            <GlassPanel className="mb-6 border-white/10 p-4 text-sm text-muted">
              {t('clubs.currentPlan')}: <span className="font-semibold text-ivory">{tier}</span>
            </GlassPanel>
          )}

          <GlassPanel className="mb-6 border-white/10 p-5">
            <SectionHeader eyebrow="People" title={t('clubs.members')} className="mb-4" />
            <ul className="space-y-2">
              {club.members?.map((m) => (
                <li
                  key={m.user.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">@{m.user.nickname}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                      {m.role}
                    </span>
                    {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') &&
                    m.role !== 'OWNER' ? (
                      <>
                        {m.role !== 'ADMIN' ? (
                          <button
                            type="button"
                            className="text-[10px] text-gold"
                            onClick={() =>
                              void apiFetch(`/clubs/${clubId}/members/${m.user.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: 'ADMIN' })
                              }).then(reload)
                            }
                          >
                            Promote
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-[10px] text-muted"
                            onClick={() =>
                              void apiFetch(`/clubs/${clubId}/members/${m.user.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ role: 'MEMBER' })
                              }).then(reload)
                            }
                          >
                            Demote
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-[10px] text-rose-300"
                          onClick={() =>
                            void apiFetch(`/clubs/${clubId}/members/${m.user.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ remove: true })
                            }).then(reload)
                          }
                        >
                          Remove
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  className="flex-1"
                  placeholder="@nickname"
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
                      setMsg(t('clubs.memberAdded', { defaultValue: 'Member added' }));
                    });
                  }}
                >
                  {t('clubs.addMember', { defaultValue: 'Add' })}
                </Button>
              </div>
            )}
          </GlassPanel>

          <GlassPanel className="border-white/10 p-5">
            <SectionHeader eyebrow="Tables" title={t('clubs.privateTables')} className="mb-4" />
            {tables.filter((tbl) => tbl.status !== 'CLOSED').length > 0 ? (
              <ul className="mb-4 space-y-2">
                {tables
                  .filter((tbl) => tbl.status !== 'CLOSED')
                  .map((tbl) => (
                    <li
                      key={tbl.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-zinc-200">{tbl.name}</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge variant={tbl.status === 'LIVE' ? 'emerald' : 'default'}>{tbl.status}</Badge>
                          <Badge>{tbl.mode}</Badge>
                        </div>
                      </div>
                      <Link
                        to={`/clubs/${clubId}/tables/${tbl.id}`}
                        className="premium-link shrink-0 text-xs font-semibold uppercase tracking-wider"
                      >
                        {t('clubs.manageTable')}
                      </Link>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">{t('clubs.noActiveTables')}</p>
            )}
            {(club.myRole === 'OWNER' || club.myRole === 'ADMIN') && !readOnly && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {(['HOLDEM', 'JOKER'] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant={tableMode === m ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setTableMode(m)}
                    >
                      {t(`modes.${m}.title`)}
                    </Button>
                  ))}
                  {tableMode === 'JOKER' ? (
                    <span className="self-center text-xs text-muted">{t('lobby.jokerBotPlayerCount')}</span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    className="flex-1"
                    placeholder={t('clubs.namePlaceholder')}
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      void createPrivateTable(clubId, { name: tableName, mode: tableMode }).then(({ table }) => {
                        navigate(`/clubs/${clubId}/tables/${table.id}`);
                      });
                    }}
                  >
                    {t('clubs.createBtn')}
                  </Button>
                </div>
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
        <GlassPanel className="border-white/10 p-6 text-muted">{t('clubs.loadError')}</GlassPanel>
      )}
    </PageShell>
  );
};
