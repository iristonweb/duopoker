import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppBackground, Button, GlassPanel } from '@duopoker/ui-kit';
import { useAppStore, type ClubSummary } from '../store/useAppStore';

export const Clubs = () => {
  const fetchClubs = useAppStore((s) => s.fetchClubs);
  const accessToken = useAppStore((s) => s.accessToken);
  const [clubs, setClubs] = useState<ClubSummary[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!accessToken) return;
    void fetchClubs()
      .then((d) => setClubs(d.clubs))
      .catch(() => setError('Не удалось загрузить клубы'));
  }, [accessToken, fetchClubs]);

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-100">Приватные клубы</h1>
          <Link to="/lobby" className="text-sm text-gold hover:underline">
            Лобби
          </Link>
        </div>
        {!accessToken ? (
          <GlassPanel className="p-6 text-muted">Войдите, чтобы управлять клубами.</GlassPanel>
        ) : (
          <>
            <Link to="/clubs/new">
              <Button variant="primary" className="mb-6">
                Создать клуб
              </Button>
            </Link>
            {error ? <p className="text-amber-400">{error}</p> : null}
            <div className="flex flex-col gap-3">
              {clubs.map((c) => (
                <Link key={c.id} to={`/clubs/${c.id}`}>
                  <GlassPanel className="border-white/10 p-4 hover:border-gold/30">
                    <p className="font-semibold text-zinc-100">{c.name}</p>
                    <p className="text-sm text-muted">
                      {c.organizerPlan?.tier ?? 'BASIC'} · {c._count?.members ?? 0} участников · роль: {c.myRole}
                    </p>
                  </GlassPanel>
                </Link>
              ))}
              {!clubs.length && !error ? (
                <p className="text-muted">У вас пока нет клубов. Создайте первый!</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
