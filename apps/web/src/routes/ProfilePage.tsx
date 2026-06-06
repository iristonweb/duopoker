import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  subscriptionBannerImages,
  subscriptionCosmetics,
  tierLabel,
  type SubscriptionTier
} from '@duopoker/shared-types';
import {
  AppBackground,
  Badge,
  Button,
  DpClubMark,
  GlassPanel,
  PageShell,
  SectionHeader,
  SkinSelector,
  SubscriptionTierCard,
  type CosmeticItem
} from '@duopoker/ui-kit';
import { ProfileEditor } from '../components/ProfileEditor';
import { PlayerAvatar } from '../components/cosmetics/PlayerAvatar';
import { PokerChipVisual } from '../components/cosmetics/PokerChipVisual';
import { useAppStore } from '../store/useAppStore';
import { resolveApiUrl } from '../config/api';

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } }
};

export const ProfilePage = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const accessToken = useAppStore((s) => s.accessToken);
  const displayName = useAppStore((s) => s.displayName);
  const nickname = useAppStore((s) => s.nickname);
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const tableStatus = useAppStore((s) => s.tableStatus);
  const chips = useAppStore((s) => s.chips);
  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const inventory = useAppStore((s) => s.inventory);
  const equipCosmetic = useAppStore((s) => s.equipCosmetic);
  const buyCosmetic = useAppStore((s) => s.buyCosmetic);
  const fetchProfile = useAppStore((s) => s.fetchProfile);

  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [shopMsg, setShopMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    void fetch(resolveApiUrl('/monetization/catalog'))
      .then((r) => r.json())
      .then((d: { cosmetics?: CosmeticItem[] }) => setCosmetics(d.cosmetics ?? []))
      .catch(() => undefined);
  }, []);

  if (!accessToken) {
    return <Navigate to="/lobby" replace />;
  }

  const tierPerks = (tier: SubscriptionTier) =>
    subscriptionCosmetics.filter((c) => c.requiredTier === tier).map((c) => c.name);

  const nickLabel = nickname ? `@${nickname}` : displayName ?? t('auth.player');

  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <PageShell
        maxWidth="4xl"
        back={
          <Link to="/lobby" className="premium-link text-sm">
            {t('nav.backLobby')}
          </Link>
        }
      >
        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={reduceMotion ? undefined : fade}
          className="mb-10"
        >
          <div className="flex flex-wrap items-center gap-3">
            <DpClubMark size="md" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
                {t('profile.pageEyebrow')}
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-ivory sm:text-4xl">
                {t('profile.pageTitle')}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{t('profile.pageDesc')}</p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={reduceMotion ? undefined : fade}
          className="mb-8"
        >
          <GlassPanel glow="gold" className="relative overflow-hidden border-gold/20 p-0">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
            <div className="border-b border-white/10 bg-gradient-to-br from-gold/10 via-transparent to-transparent px-6 py-8 sm:px-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <PlayerAvatar
                    name={nickLabel}
                    avatarUrl={avatarUrl}
                    frameId={equipped.frame}
                    tier={subscriptionTier}
                    tableStatus={tableStatus}
                    size="lg"
                    showTier
                  />
                  <div>
                    <p className="font-display text-2xl font-semibold text-gradient-gold">{nickLabel}</p>
                    <p className="text-sm text-muted">{displayName}</p>
                    {tableStatus ? (
                      <p className="mt-1 max-w-xs truncate text-xs text-gold/80">{tableStatus}</p>
                    ) : null}
                    {chips != null ? (
                      <div className="mt-2 flex items-center gap-2">
                        <PokerChipVisual chipId={equipped.chip} size="sm" />
                        <span className="font-mono text-sm font-medium text-emerald">{chips.toLocaleString()}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <Badge variant={subscriptionTier === 'FREE' ? 'default' : 'gold'} className="self-start sm:self-center">
                  {subscriptionTier === 'FREE'
                    ? t('profile.tierFree')
                    : tierLabel[subscriptionTier as Exclude<SubscriptionTier, 'FREE'>]}
                </Badge>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <ProfileEditor />
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={reduceMotion ? undefined : fade}
          className="mb-8 grid gap-4 lg:grid-cols-2"
        >
          <SkinSelector
            catalog={cosmetics}
            subscriptionTier={subscriptionTier}
            inventory={inventory}
            equipped={equipped}
            eyebrow={t('cosmetics.eyebrow')}
            title={t('cosmetics.title')}
            description={t('cosmetics.desc')}
            slotTabs={[
              { id: 'deck' as const, label: t('cosmetics.tabs.deck') },
              { id: 'chip' as const, label: t('cosmetics.tabs.chip') },
              { id: 'frame' as const, label: t('cosmetics.tabs.frame') }
            ]}
            equipLabel={t('cosmetics.equip')}
            equippedLabel={t('cosmetics.equipped')}
            buyLabel={t('cosmetics.buy')}
            onEquip={(itemId) => equipCosmetic(itemId)}
            onBuy={(itemId) => {
              void buyCosmetic(itemId)
                .then(() => setShopMsg(null))
                .catch(() => setShopMsg(t('lobby.checkoutFailed')));
            }}
          />
          <GlassPanel glow={subscriptionTier === 'FREE' ? 'gold' : 'emerald'} className="border-white/10 p-6">
            <SectionHeader
              eyebrow={t('profile.perksEyebrow')}
              title={t('profile.perksTitle')}
              description={t('profile.perksDesc')}
            />
            {subscriptionTier === 'FREE' ? (
              <SubscriptionTierCard
                tier="SILVER"
                price={t('subscriptions.priceSilver')}
                tierName={t('subscriptions.silver')}
                perkDescription={t('subscriptions.perkSummary.silver')}
                perks={tierPerks('SILVER')}
                bannerUrl={subscriptionBannerImages.SILVER}
                featured
              >
                <Link to="/lobby#subscriptions">
                  <Button variant="primary" size="sm" className="w-full">
                    {t('lobby.subscribe')}
                  </Button>
                </Link>
              </SubscriptionTierCard>
            ) : (
              <ul className="mt-4 space-y-2">
                {tierPerks(subscriptionTier).map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-ivory/90">
                    <span className="text-gold">✦</span>
                    {perk}
                  </li>
                ))}
              </ul>
            )}
            {shopMsg ? <p className="mt-4 text-xs text-rose-300">{shopMsg}</p> : null}
          </GlassPanel>
        </motion.div>
      </PageShell>
    </div>
  );
};
