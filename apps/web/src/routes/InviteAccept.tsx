import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppBackground, Button, GlassPanel } from '@duopoker/ui-kit';
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

  useEffect(() => {
    if (!code) return;
    fetch(resolveApiUrl(`/clubs/invite/${code}`))
      .then((r) => r.json())
      .then(setPreview)
      .catch(() => undefined);
  }, [code]);

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-16">
        <GlassPanel className="border-white/10 p-6">
          <h1 className="text-xl font-bold text-zinc-100">Приглашение за стол</h1>
          {preview?.table ? (
            <p className="mt-2 text-muted">
              {preview.table.name} · клуб {preview.table.clubName}
            </p>
          ) : (
            <p className="mt-2 text-muted">Загрузка…</p>
          )}
          {!accessToken ? (
            <p className="mt-4 text-sm text-amber-400">Войдите в аккаунт, чтобы принять приглашение.</p>
          ) : (
            <Button
              className="mt-6"
              variant="primary"
              onClick={() => {
                if (!code) return;
                void acceptInviteByCode(code).then(({ clubId, tableId }) => {
                  navigate(`/clubs/${clubId}/tables/${tableId}`);
                });
              }}
            >
              Принять
            </Button>
          )}
          <Link to="/lobby" className="mt-4 block text-sm text-gold hover:underline">
            Лобби
          </Link>
        </GlassPanel>
      </div>
    </div>
  );
};
