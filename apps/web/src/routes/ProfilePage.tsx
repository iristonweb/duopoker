import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  subscriptionBannerImages,
  tierLabel,
  type SubscriptionTier
} from '@duopoker/shared-types';
import {
  Badge,
  Button,
  DpClubMark,
  GlassPanel,
  PageShell,
  SectionHeader,
  SkinSelector,
  type CosmeticItem
} from '@duopoker/ui-kit';
import { ProfileEditor } from '../components/ProfileEditor';
import { PushSettingsPanel } from '../components/PushSettingsPanel';
import { ReferralPanel } from '../components/referrals/ReferralPanel';
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
  const gamesPlayed = useAppStore((s) => s.gamesPlayed);
  const gamesWon = useAppStore((s) => s.gamesWon);
  const gamesLost = useAppStore((s) => s.gamesLost);
  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const inventory = useAppStore((s) => s.inventory);
  const equipCosmetic = useAppStore((s) => s.equipCosmetic);
  const buyCosmetic = useAppStore((s) => s.buyCosmetic);
  const fetchProfile = useAppStore((s) => s.fetchProfile);
  const apiFetch = useAppStore((s) => s.apiFetch);

  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [bonusMsg, setBonusMsg] = useState<string | null>(null);
  const [bonusBusy, setBonusBusy] = useState(false);

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

  const cosmeticSlotTabs = [
    { id: 'deck' as const, label: t('cosmetics.tabs.deck') },
    { id: 'chip' as const, label: t('cosmetics.tabs.chip') },
    { id: 'frame' as const, label: t('cosmetics.tabs.frame') },
    { id: 'title' as const, label: t('cosmetics.tabs.title') },
    { id: 'table' as const, label: t('cosmetics.tabs.table') }
  ];

  const nickLabel = nickname ? `@${nickname}` : displayName ?? t('auth.player');
  const paidTier = subscriptionTier !== 'FREE' ? subscriptionTier : null;

  const claimDailyBonus = async () => {
    setBonusBusy(true);
    setBonusMsg(null);
    try {
      const res = await apiFetch('/monetization/bonus', { method: 'POST' });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setBonusMsg(
          err.error === 'ALREADY_CLAIMED' ? t('profile.dailyBonusClaimed') : t('profile.dailyBonusFailed')
        );
        return;
      }
      const data = (await res.json()) as { amount?: number };
      setBonusMsg(t('profile.dailyBonusOk', { amount: data.amount ?? 500 }));
      await fetchProfile();
    } finally {
      setBonusBusy(false);
    }
  };

  return (
    <PageShell
      maxWidth="6xl"
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
                    titleId={equipped.title}
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
          className="mb-8 grid grid-cols-3 items-start gap-3 sm:gap-4"
        >
          <GlassPanel className="border-white/10 p-4 text-center sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{t('profile.statsPlayed')}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ivory">{gamesPlayed}</p>
          </GlassPanel>
          <GlassPanel glow="emerald" className="border-emerald/20 p-4 text-center sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{t('profile.statsWon')}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-emerald">{gamesWon}</p>
          </GlassPanel>
          <GlassPanel className="border-white/10 p-4 text-center sm:p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-subtle">{t('profile.statsLost')}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-muted">{gamesLost}</p>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={reduceMotion ? undefined : fade}
          className="mb-8 grid items-start gap-4 lg:grid-cols-2"
        >
          <ReferralPanel />
          <PushSettingsPanel />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={reduceMotion ? undefined : fade}
          className="mb-8"
        >
          <GlassPanel glow="emerald" className="flex flex-col gap-3 border-emerald/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
            <SectionHeader
              compact
              className="mb-0 min-w-0 sm:flex-1"
              eyebrow={t('profile.dailyBonusEyebrow')}
              title={t('profile.dailyBonusTitle')}
              description={t('profile.dailyBonusDesc')}
            />
            <div className="shrink-0">
              <Button variant="primary" size="md" disabled={bonusBusy} onClick={() => void claimDailyBonus()}>
                {bonusBusy ? t('profile.dailyBonusClaiming') : t('profile.dailyBonusClaim')}
              </Button>
              {bonusMsg ? <p className="mt-3 text-xs text-gold-light">{bonusMsg}</p> : null}
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          variants={reduceMotion ? undefined : fade}
          className="mb-8"
        >
          <GlassPanel
            glow={subscriptionTier === 'FREE' ? 'gold' : 'emerald'}
            className="overflow-hidden border-white/10 p-0"
          >
            <div className="border-b border-white/10 bg-gradient-to-br from-gold/[0.08] via-transparent to-emerald/[0.04] px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {paidTier ? (
                  <img
                    src={subscriptionBannerImages[paidTier]}
                    alt=""
                    className="h-20 w-36 shrink-0 rounded-lg object-cover object-left shadow-lg ring-1 ring-white/10"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <SectionHeader
                    compact
                    className="mb-3"
                    eyebrow={t('profile.subscriptionBlockEyebrow')}
                    title={t('profile.subscriptionBlockTitle')}
                    description={t('profile.subscriptionBlockDesc')}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant={paidTier ? 'gold' : 'default'}>
                      {paidTier
                        ? t('profile.subscriptionActive', { tier: tierLabel[paidTier] })
                        : t('profile.tierFree')}
                    </Badge>
                    {paidTier ? (
                      <>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-subtle">
                          {t('profile.subscriptionUnlockedSlots')}:
                        </span>
                        {cosmeticSlotTabs.map((tab) => (
                          <span
                            key={tab.id}
                            className="rounded-full border border-emerald/25 bg-emerald/10 px-2 py-0.5 text-[10px] font-medium text-emerald"
                          >
                            {tab.label}
                          </span>
                        ))}
                      </>
                    ) : (
                      <>
                        <p className="w-full text-xs text-muted">{t('profile.subscriptionUpgradeHint')}</p>
                        <Link to="/lobby#subscriptions">
                          <Button variant="primary" size="sm">
                            {t('lobby.subscribe')}
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <SkinSelector
                embedded
                catalog={cosmetics}
                subscriptionTier={subscriptionTier}
                inventory={inventory}
                equipped={equipped}
                slotTabs={cosmeticSlotTabs}
                equipLabel={t('cosmetics.equip')}
                equippedLabel={t('cosmetics.equipped')}
                buyLabel={t('cosmetics.buy')}
                headerExtra={
                  shopMsg ? <p className="mb-3 text-xs text-rose-300">{shopMsg}</p> : null
                }
                onEquip={(itemId) => {
                  void equipCosmetic(itemId).then((result) => {
                    if (!result.ok) setShopMsg(t('cosmetics.equipFailed'));
                    else setShopMsg(null);
                  });
                }}
                onBuy={(itemId) => {
                  void buyCosmetic(itemId)
                    .then(() => setShopMsg(null))
                    .catch(() => setShopMsg(t('lobby.checkoutFailed')));
                }}
              />
            </div>
          </GlassPanel>
        </motion.div>
      </PageShell>
  );
};
