import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppBackground, Button, GlassPanel } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

type TableData = {
  id: string;
  name: string;
  mode: string;
  status: string;
  sessionId?: string | null;
  inviteCode: string;
  virtualBuyIn: number;
  seats: Array<{ user: { nickname: string }; status: string }>;
};

export const TableManager = () => {
  const { clubId, tableId } = useParams<{ clubId: string; tableId: string }>();
  const apiFetch = useAppStore((s) => s.apiFetch);
  const inviteToTable = useAppStore((s) => s.inviteToTable);
  const startPrivateTable = useAppStore((s) => s.startPrivateTable);
  const joinPrivateTable = useAppStore((s) => s.joinPrivateTable);
  const navigate = useNavigate();
  const [table, setTable] = useState<TableData | null>(null);
  const [inviteQuery, setInviteQuery] = useState('');
  const [msg, setMsg] = useState<string>();

  const reload = () => {
    if (!clubId || !tableId) return;
    void apiFetch(`/clubs/${clubId}/private-tables/${tableId}`)
      .then((r) => r.json())
      .then((d: { table: TableData }) => setTable(d.table));
  };

  useEffect(reload, [clubId, tableId, apiFetch]);

  if (!clubId || !tableId) return null;

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <Link to={`/clubs/${clubId}`} className="text-sm text-gold hover:underline">
          ← Клуб
        </Link>
        {table ? (
          <GlassPanel className="mt-4 border-white/10 p-6">
            <h1 className="text-xl font-bold text-zinc-100">{table.name}</h1>
            <p className="text-sm text-muted">
              {table.mode} · {table.status} · buy-in {table.virtualBuyIn}
            </p>
            <p className="mt-2 text-xs text-subtle">
              Invite link: {window.location.origin}/invite/{table.inviteCode}
            </p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {table.seats.map((s, i) => (
                <li key={i}>
                  @{s.user.nickname} — {s.status}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <input
                placeholder="@nickname или id"
                className="flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void inviteToTable(clubId, tableId, inviteQuery).then(() => {
                    setInviteQuery('');
                    reload();
                    setMsg('Приглашение отправлено');
                  });
                }}
              >
                Пригласить
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {table.status !== 'LIVE' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    void startPrivateTable(clubId, tableId).then((sid) => navigate(`/table/${sid}`));
                  }}
                >
                  Запустить стол
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => {
                    void joinPrivateTable(clubId, tableId).then((sid) => navigate(`/table/${sid}`));
                  }}
                >
                  Войти за стол
                </Button>
              )}
            </div>
            {msg ? <p className="mt-4 text-sm text-emerald/90">{msg}</p> : null}
          </GlassPanel>
        ) : (
          <p className="mt-8 text-muted">Загрузка…</p>
        )}
      </div>
    </div>
  );
};
