import { useTranslation } from 'react-i18next';
import type { PaidSubscriptionTier } from '@duopoker/shared-types';
import { Button, cn } from '@duopoker/ui-kit';
import { GlassModal } from '../GlassModal';
import { SubscriptionCosmeticBundle } from './SubscriptionCosmeticBundle';

const tierLabelClass: Record<PaidSubscriptionTier, string> = {
  BRONZE: 'text-amber-300',
  SILVER: 'text-zinc-200',
  GOLD: 'text-gold-light',
  PLATINUM: 'text-violet-200',
  DIAMOND: 'text-cyan-200',
  BLACK: 'text-gradient-gold'
};

const tierBorder: Record<PaidSubscriptionTier, string> = {
  BRONZE: 'border-amber-700/25',
  SILVER: 'border-zinc-400/20',
  GOLD: 'border-gold/25',
  PLATINUM: 'border-violet-400/25',
  DIAMOND: 'border-cyan-400/25',
  BLACK: 'border-amber-500/30'
};

export function SubscriptionDetailModal({
  tier,
  open,
  onClose,
  tierName,
  price,
  perkDescription,
  featureBullets,
  bannerUrl,
  cosmeticSlotLabels,
  active,
  subscribeBusy,
  onSubscribe
}: {
  tier: PaidSubscriptionTier;
  open: boolean;
  onClose: () => void;
  tierName: string;
  price: string;
  perkDescription: string;
  featureBullets: string[];
  bannerUrl?: string;
  cosmeticSlotLabels: Record<'deck' | 'chip' | 'frame' | 'title', string>;
  active: boolean;
  subscribeBusy: boolean;
  onSubscribe: () => void;
}) {
  const { t } = useTranslation();
  const glow = tier === 'GOLD' || tier === 'BLACK' ? 'gold' : tier === 'PLATINUM' || tier === 'DIAMOND' ? 'emerald' : 'none';

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      eyebrow={t('lobby.subscriptionsEyebrow')}
      title={tierName}
      closeLabel={t('lobby.subscriptionModalClose')}
      glow={glow}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-lg font-semibold text-gold">{price}</p>
          <Button
            variant={active ? 'ghost' : 'primary'}
            size="md"
            className="w-full sm:w-auto sm:min-w-[12rem]"
            disabled={active || subscribeBusy}
            onClick={onSubscribe}
          >
            {active
              ? t('lobby.subscriptionActive')
              : subscribeBusy
                ? t('lobby.subscribing')
                : t('lobby.subscribe')}
          </Button>
        </div>
      }
    >
      <div className={cn('overflow-hidden rounded-2xl border', tierBorder[tier])}>
        {bannerUrl ? (
          <div className="relative aspect-[21/9] w-full bg-[#050508]">
            <img src={bannerUrl} alt="" className="h-full w-full object-cover object-center" loading="lazy" decoding="async" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
            <div className="absolute bottom-3 left-4">
              <p className={cn('font-display text-2xl font-semibold', tierLabelClass[tier])}>{tierName}</p>
              <p className="text-sm font-semibold text-gold">{price}</p>
            </div>
          </div>
        ) : null}
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted">{perkDescription}</p>

      {featureBullets.length ? (
        <section className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/70">
            {t('lobby.subscriptionModalPerks')}
          </p>
          <ul className="mt-3 space-y-2 rounded-2xl border border-white/[0.06] bg-black/25 p-4">
            {featureBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2.5 text-sm text-ivory/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/15 text-xs text-emerald">
                  ✓
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/70">
          {t('lobby.subscriptionModalCosmetics')}
        </p>
        <div className="mt-3 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <SubscriptionCosmeticBundle tier={tier} labels={cosmeticSlotLabels} />
        </div>
      </section>
    </GlassModal>
  );
}
