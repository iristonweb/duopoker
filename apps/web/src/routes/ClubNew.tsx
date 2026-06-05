import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, GlassPanel, Input, PageShell, Textarea } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

export const ClubNew = () => {
  const { t } = useTranslation();
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
      setError(t('clubs.createError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      maxWidth="lg"
      back={
        <Link to="/clubs" className="premium-link text-sm">
          {t('clubs.back')}
        </Link>
      }
      eyebrow={t('clubs.newEyrow')}
      title={t('clubs.newTitle')}
      description={t('clubs.newDesc')}
    >
      <GlassPanel glow="gold" className="border-gold/15 p-6">
        <div className="flex flex-col gap-4">
          <Input
            label={t('clubs.name')}
            placeholder={t('clubs.namePlaceholder')}
            minLength={3}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            label={t('clubs.description')}
            placeholder={t('clubs.descPlaceholder')}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error ? (
            <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          ) : null}
          <Button variant="primary" className="mt-2 w-full" disabled={busy || name.length < 3} onClick={() => void submit()}>
            {busy ? t('clubs.creating') : t('clubs.createBtn')}
          </Button>
        </div>
      </GlassPanel>
    </PageShell>
  );
};
