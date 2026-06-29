import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, GlassPanel, Input, OrganizerPlanCard, PageShell, Textarea } from '@duopoker/ui-kit';
import { ORGANIZER_PLAN_PRICES_RUB, organizerPlanBanners } from '@duopoker/shared-types';
import { useAppStore } from '../store/useAppStore';

const formatPlanPrice = (rub: number) =>
  rub === 0 ? '0 ₽' : `${rub.toLocaleString('ru-RU')} ₽/мес`;

export const ClubOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createClub = useAppStore((s) => s.createClub);
  const upgradeClubPlan = useAppStore((s) => s.upgradeClubPlan);
  const createPrivateTable = useAppStore((s) => s.createPrivateTable);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clubId, setClubId] = useState<string>();
  const [tableName, setTableName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const onCreateClub = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const { club } = await createClub(name, description || undefined);
      setClubId(club.id);
      setStep(2);
    } catch {
      setError(t('clubs.createError'));
    } finally {
      setBusy(false);
    }
  };

  const onSkipPlan = () => setStep(3);

  const onUpgrade = async (tier: 'PRO' | 'NETWORK') => {
    if (!clubId) return;
    setBusy(true);
    try {
      await upgradeClubPlan(clubId, tier);
      setStep(3);
    } catch {
      setError('Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  const onCreateTable = async () => {
    if (!clubId || !tableName.trim()) return;
    setBusy(true);
    try {
      const { table } = await createPrivateTable(clubId, { name: tableName, mode: 'HOLDEM' });
      navigate(`/clubs/${clubId}/tables/${table.id}`);
    } catch {
      setError('Could not create table');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      maxWidth="4xl"
      back={
        <Link to="/clubs" className="premium-link text-sm">
          {t('clubs.back')}
        </Link>
      }
      eyebrow="Onboarding"
      title="Set up your club"
      description={`Step ${step} of 3 — create club, choose plan, launch first table.`}
    >
      <GlassPanel className="border-white/10 p-6">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Input label={t('clubs.name')} value={name} onChange={(e) => setName(e.target.value)} minLength={3} />
            <Textarea
              label={t('clubs.description')}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button variant="primary" disabled={busy || name.length < 3} onClick={() => void onCreateClub()}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && clubId && (
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <OrganizerPlanCard tier="BASIC" price={formatPlanPrice(0)} description="Free tier" bannerUrl={organizerPlanBanners.BASIC}>
              <Button variant="secondary" size="sm" className="w-full" onClick={onSkipPlan}>
                Continue free
              </Button>
            </OrganizerPlanCard>
            <OrganizerPlanCard tier="PRO" price={formatPlanPrice(ORGANIZER_PLAN_PRICES_RUB.PRO)} description="Pro" bannerUrl={organizerPlanBanners.PRO}>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => void onUpgrade('PRO')}>
                Upgrade
              </Button>
            </OrganizerPlanCard>
            <OrganizerPlanCard tier="NETWORK" price={formatPlanPrice(ORGANIZER_PLAN_PRICES_RUB.NETWORK)} description="Network" bannerUrl={organizerPlanBanners.NETWORK}>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => void onUpgrade('NETWORK')}>
                Upgrade
              </Button>
            </OrganizerPlanCard>
          </div>
        )}

        {step === 3 && clubId && (
          <div className="flex flex-col gap-4">
            <Input
              label="First table name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder={t('clubs.namePlaceholder')}
            />
            <div className="flex gap-2">
              <Button variant="primary" disabled={busy || tableName.length < 3} onClick={() => void onCreateTable()}>
                Create table
              </Button>
              <Button variant="secondary" onClick={() => navigate(`/clubs/${clubId}`)}>
                Skip to dashboard
              </Button>
            </div>
          </div>
        )}

        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </GlassPanel>
    </PageShell>
  );
};
