import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBackground, Button, GlassPanel } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

export const ClubNew = () => {
  const createClub = useAppStore((s) => s.createClub);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const { club } = await createClub(name, description || undefined);
      navigate(`/clubs/${club.id}`);
    } catch {
      setError('Не удалось создать клуб');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-10">
        <Link to="/clubs" className="text-sm text-gold hover:underline">
          ← Клубы
        </Link>
        <GlassPanel className="mt-4 border-white/10 p-6">
          <h1 className="text-xl font-bold text-zinc-100">Новый клуб</h1>
          <label className="mt-4 block text-sm text-subtle">Название</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-zinc-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="mt-4 block text-sm text-subtle">Описание</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-zinc-100"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error ? <p className="mt-2 text-sm text-amber-400">{error}</p> : null}
          <Button variant="primary" className="mt-6 w-full" disabled={busy || name.length < 3} onClick={() => void submit()}>
            Создать
          </Button>
        </GlassPanel>
      </div>
    </div>
  );
};
