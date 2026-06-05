import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, EmptyState, GlassPanel, LoadingSkeleton, PageShell } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';
import { resolveApiUrl } from '../config/api';

export const InviteAccept = () => {
  const { code } = useParams<{ code: string }>();
  const accessToken = useAppStore((s) => s.accessToken);
  const acceptInviteByCode = useAppStore((s) => s.acceptInviteByCode);
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{ table: { name: string; clubName: string }; seats: unknown[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    fetch(resolveApiUrl(`/clubs/invite/${code}`))
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <PageShell
      maxWidth="lg"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          ← Лобби
        </Link>
      }
      eyebrow="Table invite"
      title="Приглашение за стол"
    >
      {loading ? (
        <GlassPanel className="border-white/10 p-8">
          <LoadingSkeleton lines={3} />
        </GlassPanel>
      ) : preview?.table ? (
        <GlassPanel glow="gold" className="border-gold/15 p-6">
          <p className="font-display text-xl font-semibold text-ivory">{preview.table.name}</p>
          <p className="mt-2 text-sm text-muted">Клуб: {preview.table.clubName}</p>
          <Badge className="mt-4" variant="emerald">
            {preview.seats?.length ?? 0} seats
          </Badge>
          {!accessToken ? (
            <EmptyState
              className="mt-6 border-0 bg-transparent p-0"
              title="Требуется вход"
              description="Войдите в аккаунт в лобби, чтобы принять приглашение."
              action={
                <Link to="/lobby">
                  <Button variant="secondary" size="sm">
                    Перейти в лобби
                  </Button>
                </Link>
              }
            />
          ) : (
            <Button
              className="mt-6 w-full"
              variant="primary"
              onClick={() => {
                if (!code) return;
                void acceptInviteByCode(code).then(({ clubId, tableId }) => {
                  navigate(`/clubs/${clubId}/tables/${tableId}`);
                });
              }}
            >
              Принять приглашение
            </Button>
          )}
        </GlassPanel>
      ) : (
        <EmptyState title="Приглашение недействительно" description="Ссылка устарела или уже использована." />
      )}
    </PageShell>
  );
};
