import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, GlassPanel, Input, LoadingSkeleton, PageShell, SectionHeader } from '@duopoker/ui-kit';
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
  const [loading, setLoading] = useState(true);
  const [inviteQuery, setInviteQuery] = useState('');
  const [msg, setMsg] = useState<string>();

  const reload = () => {
    if (!clubId || !tableId) return;
    setLoading(true);
    void apiFetch(`/clubs/${clubId}/private-tables/${tableId}`)
      .then((r) => r.json())
      .then((d: { table: TableData }) => setTable(d.table))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [clubId, tableId, apiFetch]);

  if (!clubId || !tableId) return null;

  return (
    <PageShell
      maxWidth="2xl"
      back={
        <Link to={`/clubs/${clubId}`} className="premium-link text-sm">
          ← Клуб
        </Link>
      }
    >
      {loading && !table ? (
        <GlassPanel className="border-white/10 p-8">
          <LoadingSkeleton lines={4} />
        </GlassPanel>
      ) : table ? (
        <GlassPanel glow="emerald" className="border-emerald/15 p-6">
          <SectionHeader eyebrow="Private table" title={table.name} className="mb-4" />
          <div className="flex flex-wrap gap-2">
            <Badge>{table.mode}</Badge>
            <Badge variant={table.status === 'LIVE' ? 'emerald' : 'default'}>{table.status}</Badge>
            <Badge variant="gold">Buy-in {table.virtualBuyIn}</Badge>
          </div>
          <p className="mt-4 rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-subtle">
            {window.location.origin}/invite/{table.inviteCode}
          </p>
          <ul className="mt-5 space-y-2">
            {table.seats.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="text-zinc-200">@{s.user.nickname}</span>
                <span className="text-subtle">{s.status}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Input
              className="flex-1"
              placeholder="@nickname или id"
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
            />
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
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
                  void startPrivateTable(clubId, tableId).then((sid) => {
                    useAppStore.getState().resetTableJoin();
                    navigate(`/table/${sid}`);
                  });
                }}
              >
                Запустить стол
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  void joinPrivateTable(clubId, tableId).then((sid) => {
                    useAppStore.getState().resetTableJoin();
                    navigate(`/table/${sid}`);
                  });
                }}
              >
                Войти за стол
              </Button>
            )}
          </div>
          {msg ? (
            <p className="mt-4 rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-sm text-emerald">
              {msg}
            </p>
          ) : null}
        </GlassPanel>
      ) : (
        <GlassPanel className="border-white/10 p-6 text-muted">Стол не найден.</GlassPanel>
      )}
    </PageShell>
  );
};
