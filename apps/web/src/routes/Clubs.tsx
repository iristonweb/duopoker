import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { clubsHeroBanner } from '@duopoker/shared-types';
import {
  Button,
  EmptyState,
  GlassPanel,
  LoadingSkeleton,
  PageShell
} from '@duopoker/ui-kit';
import { useAppStore, type ClubSummary } from '../store/useAppStore';

export const Clubs = () => {
  const { t } = useTranslation();
  const fetchClubs = useAppStore((s) => s.fetchClubs);
  const accessToken = useAppStore((s) => s.accessToken);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(accessToken));

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    void fetchClubs()
      .then((d) => setClubs(d.clubs))
      .catch(() => setError(t('clubs.loadError')))
      .finally(() => setLoading(false));
  }, [accessToken, fetchClubs, t]);

  return (
    <PageShell
      maxWidth="6xl"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          {t('nav.backLobby')}
        </Link>
      }
      headerAction={
        accessToken ? (
          <Link to="/clubs/new">
            <Button variant="primary" size="sm">
              {t('clubs.create')}
            </Button>
          </Link>
        ) : null
      }
      eyebrow={t('clubs.eyebrow')}
      title={t('clubs.title')}
      description={t('clubs.desc')}
    >
      <div className="glass-shine relative mb-8 overflow-hidden rounded-2xl border border-white/10 ring-1 ring-white/5">
        <img
          src={clubsHeroBanner}
          alt=""
          className="block h-40 w-full object-cover object-center sm:h-48"
          loading="lazy"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/50 via-background/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
      </div>

      {!accessToken ? (
        <EmptyState
          title={t('clubs.signInTitle')}
          description={t('clubs.signInDesc')}
          action={
            <Link to="/lobby">
              <Button variant="secondary" size="sm">
                {t('clubs.goLobby')}
              </Button>
            </Link>
          }
        />
      ) : loading ? (
        <GlassPanel className="border-white/10 p-6">
          <LoadingSkeleton lines={4} />
        </GlassPanel>
      ) : error ? (
        <EmptyState title={t('clubs.loadError')} description={error} />
      ) : !clubs.length ? (
        <EmptyState
          title={t('clubs.emptyTitle')}
          description={t('clubs.emptyDesc')}
          action={
            <Link to="/clubs/new">
              <Button variant="primary" size="sm">
                {t('clubs.create')}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clubs.map((c) => (
            <Link key={c.id} to={`/clubs/${c.id}`} className="group block">
              <GlassPanel className="border-white/10 p-5 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-gold/25 group-hover:shadow-glow-gold">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-semibold text-ivory">{c.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {c.organizerPlan?.tier ?? 'BASIC'} · {c._count?.members ?? 0} {t('clubs.members')}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    {c.myRole}
                  </span>
                </div>
              </GlassPanel>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
};
