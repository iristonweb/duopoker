import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import type { PaidSubscriptionTier } from '@duopoker/shared-types';
import {
  catalogGameModes,
  clubsHeroBanner,
  lobbyHeroBanner,
  lobbyPreviewBanner,
  subscriptionBannerImages
} from '@duopoker/shared-types';
import {
  AppBackground,
  Button,
  cn,
  GlassPanel,
  Input,
  LegalDisclaimer,
  ModeCard,
  OpponentSelector,
  PlayerCountSelector,
  SectionHeader,
  SubscriptionTierCard,
  TabGroup
} from '@duopoker/ui-kit';
import { AppLogo } from '../components/AppLogo';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { VipInviteBanner } from '../components/VipInviteBanner';
import { TableInviteBanner } from '../components/TableInviteBanner';
import { useInviteNotifications } from '../hooks/useInviteNotifications';
import { usePushLoginPrompt, usePushNotifications } from '../hooks/usePushNotifications';
import { PlayingCard } from '../components/cosmetics/PlayingCard';
import { PlayerAvatar } from '../components/cosmetics/PlayerAvatar';
import { PokerChipVisual } from '../components/cosmetics/PokerChipVisual';
import { PokerTable3D } from '../components/PokerTable3D';
import { SubscriptionDetailModal } from '../components/subscriptions/SubscriptionDetailModal';
import { useAppStore } from '../store/useAppStore';
import { useTableStore } from '../store/useTableStore';
import { PwaInstallHint } from '../components/PwaInstallHint';
import {
  isAuthReferralWarning,
  translateAuthError,
  translateQueueError
} from '../lib/translate-store-error';
import { resolveApiUrl, usesRealtimeSocket } from '../config/api';

const LobbyChipPreview = lazy(() => import('../components/LobbyChipPreview'));

function PushNotifyPrompt() {
  const { t } = useTranslation();
  const { supported, permission, vapidConfigured, busy, subscribe } = usePushNotifications();
  if (!supported || permission === 'granted' || vapidConfigured === false) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-testid="lobby-enable-push"
      disabled={busy}
      className="w-full uppercase tracking-[0.28em]"
      onClick={() => void subscribe()}
    >
      {t('lobby.enablePush')}
    </Button>
  );
}

const section = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
  })
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
};

type CatalogSub = {
  tier: string;
  priceRubMonthly?: number;
  stripePriceId?: string;
  imageUrl?: string;
};
type CatalogGameMode = {
  id: 'HOLDEM' | 'JOKER';
  title: string;
  description: string;
  imageUrl: string;
};

function AuthPanel() {
  const { t } = useTranslation();
  const accessToken = useAppStore((s) => s.accessToken);
  const userId = useAppStore((s) => s.userId);
  const userRole = useAppStore((s) => s.userRole);
  const displayName = useAppStore((s) => s.displayName);
  const nickname = useAppStore((s) => s.nickname);
  const avatarUrl = useAppStore((s) => s.avatarUrl);
  const chips = useAppStore((s) => s.chips);
  const equipped = useAppStore((s) => s.equipped);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const authError = useAppStore((s) => s.authError);
  const authNotice = useAppStore((s) => s.authNotice);
  const register = useAppStore((s) => s.register);
  const login = useAppStore((s) => s.login);
  const logout = useAppStore((s) => s.logout);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [emailIn, setEmailIn] = useState('');
  const [passwordIn, setPasswordIn] = useState('');
  const [nameIn, setNameIn] = useState('');
  const [nicknameIn, setNicknameIn] = useState('');
  const [referralIn, setReferralIn] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      setReferralIn(ref.toUpperCase());
      setTab('register');
    }
  }, []);

  if (accessToken) {
    const nickLabel = nickname ? `@${nickname}` : (displayName ?? t('auth.player'));
    return (
      <GlassPanel glow="gold" className="w-full max-w-sm border-gold/20 p-4 sm:max-w-md">
        <div className="flex items-start justify-between gap-3">
          <Link
            to="/profile"
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl transition hover:bg-white/[0.03]"
          >
            <PlayerAvatar
              name={nickLabel}
              avatarUrl={avatarUrl}
              frameId={equipped.frame}
              titleId={equipped.title}
              tier={subscriptionTier}
              size="md"
              showTier
              className="transition group-hover:scale-[1.03]"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/70">
                {t('auth.welcomeBack')}
              </p>
              <p
                className="truncate font-display text-lg font-semibold text-gradient-gold"
                title={nickLabel}
              >
                {nickLabel}
              </p>
              {displayName && nickname ? (
                <p className="truncate text-xs text-muted">{displayName}</p>
              ) : null}
              {chips != null ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <PokerChipVisual chipId={equipped.chip} size="sm" />
                  <p className="text-sm text-emerald">
                    <span className="font-mono font-medium">{chips.toLocaleString()}</span>
                  </p>
                </div>
              ) : null}
              <p className="mt-1 text-[10px] font-medium text-gold/60 group-hover:text-gold">
                {t('profile.openProfile')} →
              </p>
            </div>
          </Link>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {userRole === 'SUPERADMIN' ? (
              <Link
                to="/admin"
                className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-light"
              >
                {t('auth.adminBadge')}
              </Link>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              {t('auth.signOut')}
            </Button>
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel id="auth" glow="gold" className="w-full max-w-sm border-gold/15 p-5 sm:max-w-md">
      <p className="mb-3 font-display text-lg font-semibold text-ivory">{t('auth.joinTable')}</p>
      <TabGroup
        tabs={[
          { id: 'login' as const, label: t('auth.signIn') },
          { id: 'register' as const, label: t('auth.register') }
        ]}
        value={tab}
        onChange={(next) => {
          setTab(next);
          useAppStore.setState({ authError: undefined, authNotice: undefined });
        }}
        className="mb-4"
      />
      {authError ? (
        <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {translateAuthError(authError)}
        </p>
      ) : null}
      {authNotice ? (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-xs ${
            isAuthReferralWarning(authNotice)
              ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200'
              : 'border border-emerald/20 bg-emerald/10 text-emerald'
          }`}
        >
          {translateAuthError(authNotice)}
        </p>
      ) : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (tab === 'register') {
              const name = nameIn.trim().length >= 2 ? nameIn.trim() : t('auth.player');
              const nick = nicknameIn.trim().replace(/^@/, '').toLowerCase();
              await register(emailIn, passwordIn, name, nick, referralIn);
            } else {
              await login(emailIn, passwordIn);
            }
          } catch {
            /* handled in store */
          } finally {
            setBusy(false);
          }
        }}
      >
        {tab === 'register' ? (
          <>
            <Input
              label={t('auth.displayName')}
              placeholder={t('auth.displayNamePlaceholder')}
              minLength={2}
              value={nameIn}
              onChange={(e) => setNameIn(e.target.value)}
            />
            <Input
              required
              label={t('auth.nickname')}
              placeholder={t('auth.nicknamePlaceholder')}
              minLength={3}
              maxLength={20}
              value={nicknameIn}
              onChange={(e) => setNicknameIn(e.target.value.replace(/^@/, '').toLowerCase())}
            />
            <p className="-mt-1 text-[11px] text-subtle">{t('auth.nicknameHint')}</p>
            <Input
              label={t('auth.referralCode')}
              placeholder={t('auth.referralPlaceholder')}
              maxLength={24}
              value={referralIn}
              onChange={(e) => setReferralIn(e.target.value.toUpperCase())}
            />
          </>
        ) : null}
        <Input
          required
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          value={emailIn}
          onChange={(e) => setEmailIn(e.target.value)}
        />
        <Input
          required
          label={t('auth.password')}
          type="password"
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          placeholder={t('auth.passwordPlaceholder')}
          value={passwordIn}
          onChange={(e) => setPasswordIn(e.target.value)}
        />
        <Button variant="primary" size="md" type="submit" disabled={busy} className="mt-1 w-full">
          {tab === 'register' ? t('auth.createAccount') : t('auth.signIn')}
        </Button>
      </form>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-subtle">
        {t('auth.guestHint', { id: `${userId.slice(0, 14)}…` })}
      </p>
    </GlassPanel>
  );
}

export const Lobby = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useInviteNotifications();
  usePushLoginPrompt();
  const {
    mode,
    setMode,
    opponentType,
    setOpponentType,
    botPlayerCount,
    setBotPlayerCount,
    jokerStrict,
    setJokerStrict,
    jokerMinusScoring,
    setJokerMinusScoring,
    connect,
    queue,
    pollQueueStatus,
    fetchProfile
  } = useAppStore();
  const session = useTableStore((s) => s.session);
  const accessToken = useAppStore((s) => s.accessToken);
  const sessionError = useTableStore((s) => s.sessionError);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const equipped = useAppStore((s) => s.equipped);
  const socket = useAppStore((s) => s.socket);
  const [catalogSubs, setCatalogSubs] = useState<CatalogSub[]>([]);
  const [gameModes, setGameModes] = useState<CatalogGameMode[]>(catalogGameModes);
  const [lobbyBannerUrl, setLobbyBannerUrl] = useState(lobbyHeroBanner);
  const [clubsBannerUrl, setClubsBannerUrl] = useState(clubsHeroBanner);
  const [catalogMockCheckout, setCatalogMockCheckout] = useState(false);
  const [catalogYookassaConfigured, setCatalogYookassaConfigured] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<string | null>(null);
  const [detailSubTier, setDetailSubTier] = useState<PaidSubscriptionTier | null>(null);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const [queueBanner, setQueueBanner] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceMotion = useReducedMotion();
  const showDevPanel = import.meta.env.DEV;

  useEffect(() => {
    useAppStore.getState().resetTableJoin();
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success' || checkout === 'mock') {
      void fetchProfile().then(() => {
        setCheckoutMsg(t('lobby.subscriptionActivated'));
      });
      window.history.replaceState({}, '', '/lobby');
    } else if (checkout === 'cancel') {
      setCheckoutMsg(t('lobby.checkoutCancelled'));
      window.history.replaceState({}, '', '/lobby');
    }
  }, [fetchProfile, t]);

  const queueWaitingLabel = () =>
    mode === 'JOKER' && opponentType === 'HUMAN' ? t('queue.waitingJoker') : t('queue.waiting');

  const queueWaitingSocketLabel = () =>
    mode === 'JOKER' && opponentType === 'HUMAN'
      ? t('queue.waitingSocketJoker')
      : t('queue.waitingSocket');

  useEffect(() => {
    if (!usesRealtimeSocket() || !socket) return;
    const onWait = () => setQueueBanner(queueWaitingSocketLabel());
    const onFound = () => setQueueBanner(null);
    socket.on('matchmakingWaiting', onWait);
    socket.on('matchFound', onFound);
    return () => {
      socket.off('matchmakingWaiting', onWait);
      socket.off('matchFound', onFound);
    };
  }, [socket, t, mode, opponentType]);

  useEffect(() => {
    return () => {
      if (queuePollRef.current) clearInterval(queuePollRef.current);
    };
  }, []);

  const startQueue = async () => {
    if (queueBusy) return;
    if (!accessToken) {
      setQueueBanner(t('queue.signInToPlay'));
      return;
    }
    setQueueBusy(true);
    setQueueBanner(opponentType === 'BOT' ? t('queue.startingBot') : t('queue.searching'));
    useTableStore.setState({ sessionError: undefined });
    try {
      const result = await queue();
      if (result.status === 'error') {
        setQueueBanner(null);
        return;
      }
      if (usesRealtimeSocket()) {
        return;
      }
      if (result.status === 'matched' && result.sessionId) {
        setQueueBanner(null);
        navigate(`/table/${result.sessionId}`);
        return;
      }
      const poll = async () => {
        const pollResult = await pollQueueStatus();
        if (pollResult.status === 'matched' && pollResult.sessionId) {
          if (queuePollRef.current) clearInterval(queuePollRef.current);
          queuePollRef.current = null;
          setQueueBanner(null);
          navigate(`/table/${pollResult.sessionId}`);
        } else if (pollResult.status === 'waiting') {
          setQueueBanner(queueWaitingLabel());
        } else if (pollResult.status === 'error') {
          if (queuePollRef.current) clearInterval(queuePollRef.current);
          queuePollRef.current = null;
          setQueueBanner(null);
        }
      };
      await poll();
      if (!queuePollRef.current) {
        queuePollRef.current = setInterval(poll, 2000);
      }
    } catch {
      setQueueBanner(null);
      useTableStore.setState({ sessionError: 'queue_failed' });
    } finally {
      setQueueBusy(false);
    }
  };

  useEffect(() => {
    fetch(resolveApiUrl('/monetization/catalog'))
      .then((r) => r.json())
      .then(
        (d: {
          subscriptions?: CatalogSub[];
          gameModes?: CatalogGameMode[];
          lobbyBannerUrl?: string;
          clubsBannerUrl?: string;
          mockCheckout?: boolean;
          yookassaConfigured?: boolean;
        }) => {
          setCatalogSubs(d.subscriptions ?? []);
          if (d.gameModes?.length) setGameModes(d.gameModes);
          if (d.lobbyBannerUrl) setLobbyBannerUrl(d.lobbyBannerUrl);
          if (d.clubsBannerUrl) setClubsBannerUrl(d.clubsBannerUrl);
          setCatalogMockCheckout(Boolean(d.mockCheckout));
          setCatalogYookassaConfigured(Boolean(d.yookassaConfigured));
        }
      )
      .catch(() => undefined);
  }, []);

  const startSubscription = async (tier: string) => {
    const token = useAppStore.getState().accessToken;
    if (!token) {
      setCheckoutMsg(t('lobby.signInToSubscribe'));
      return;
    }
    setCheckoutMsg(null);
    setCheckoutBusy(tier);
    try {
      const useYookassa = catalogYookassaConfigured && !catalogMockCheckout;
      if (useYookassa) {
        const res = await fetch(resolveApiUrl('/monetization/subscription/checkout'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tier })
        });
        const data = (await res.json()) as { confirmationUrl?: string; error?: string };
        if (!res.ok) {
          setCheckoutMsg(data.error ?? t('lobby.checkoutFailed'));
          return;
        }
        if (data.confirmationUrl) window.location.href = data.confirmationUrl;
        return;
      }

      if (catalogMockCheckout) {
        const res = await fetch(resolveApiUrl('/monetization/mock-subscribe'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tier })
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; tier?: string };
        if (!res.ok) {
          setCheckoutMsg(data.error ?? t('queue.failed'));
          return;
        }
        await fetchProfile();
        setCheckoutMsg(
          t('lobby.subscriptionActivatedTier', {
            tier: t(`subscriptions.${tier.toLowerCase()}` as 'subscriptions.silver')
          })
        );
        return;
      }

      setCheckoutMsg(t('lobby.yookassaNotConfigured'));
    } catch {
      setCheckoutMsg(t('lobby.networkError'));
    } finally {
      setCheckoutBusy(null);
    }
  };

  const PAID_TIERS: PaidSubscriptionTier[] = [
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'BLACK'
  ];

  const tierPerkBullets = (tier: PaidSubscriptionTier) => {
    const key = `subscriptions.perkBullets.${tier.toLowerCase()}`;
    const bullets = t(key, { returnObjects: true });
    return Array.isArray(bullets) ? (bullets as string[]) : [];
  };

  const cosmeticSlotLabels = {
    deck: t('cosmetics.tabs.deck'),
    chip: t('cosmetics.tabs.chip'),
    frame: t('cosmetics.tabs.frame'),
    title: t('cosmetics.tabs.title')
  };

  const subscriptionPriceLabel = (tier: PaidSubscriptionTier) => {
    const fromCatalog = catalogSubs.find((s) => s.tier === tier)?.priceRubMonthly;
    if (typeof fromCatalog === 'number') {
      return `${fromCatalog.toLocaleString('ru-RU')} ₽/мес`;
    }
    const priceKey = `subscriptions.price${tier.charAt(0)}${tier.slice(1).toLowerCase()}`;
    return t(priceKey);
  };

  const kettle = session
    ? session.pot +
      Object.values(session.playerRoundBet ?? {}).reduce(
        (s, v) => s + (typeof v === 'number' ? v : 0),
        0
      )
    : 0;

  const tableHref = session?.sessionId ? `/table/${session.sessionId}` : null;

  const holdemMode = gameModes.find((m) => m.id === 'HOLDEM') ?? catalogGameModes[0];
  const jokerMode = gameModes.find((m) => m.id === 'JOKER') ?? catalogGameModes[1];
  const modeTitle = (id: 'HOLDEM' | 'JOKER', fallback: string) =>
    t(`modes.${id}.title`, { defaultValue: fallback });
  const modeDesc = (id: 'HOLDEM' | 'JOKER', fallback: string) =>
    t(`modes.${id}.desc`, { defaultValue: fallback });
  const subBanner = (tier: keyof typeof subscriptionBannerImages) =>
    catalogSubs.find((s) => s.tier === tier)?.imageUrl ?? subscriptionBannerImages[tier];

  return (
    <div className="relative min-h-screen">
      <AppBackground />

      <motion.div
        className="relative z-10 mx-auto flex max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-8 xl:max-w-7xl"
        initial={false}
        animate={reduceMotion ? undefined : 'show'}
        variants={reduceMotion ? undefined : container}
      >
        <motion.header
          className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between"
          variants={reduceMotion ? undefined : section}
          custom={0}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <AppLogo size="lg" className="self-start" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
                {t('brand.eyebrow')}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ivory sm:text-4xl">
                {t('brand.title')}
                <span className="text-gradient-gold">{t('brand.titleGold')}</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                {t('brand.tagline')}
              </p>
              <div className="mt-4 flex flex-wrap gap-5 text-xs">
                <Link to="/legal/terms" className="premium-link">
                  {t('nav.terms')}
                </Link>
                <Link to="/legal/privacy" className="premium-link">
                  {t('nav.privacy')}
                </Link>
                <Link to="/legal/community" className="premium-link">
                  {t('nav.community')}
                </Link>
                <Link to="/legal/organizer" className="premium-link">
                  {t('nav.organizer')}
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <LanguageSwitch className="self-end" />
            <AuthPanel />
          </div>
        </motion.header>

        {accessToken ? (
          <motion.div
            className="mb-8 flex flex-col gap-4"
            variants={reduceMotion ? undefined : section}
            custom={0.6}
          >
            <VipInviteBanner />
            <TableInviteBanner />
            <PushNotifyPrompt />
          </motion.div>
        ) : null}

        <motion.div
          className="glass-shine relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-panel ring-1 ring-white/5"
          variants={reduceMotion ? undefined : section}
          custom={0.5}
        >
          <img
            src={lobbyBannerUrl}
            alt=""
            className="block h-40 w-full object-cover object-center sm:h-52"
            loading="eager"
            decoding="async"
            onError={(e) => {
              if (e.currentTarget.src !== lobbyPreviewBanner) {
                e.currentTarget.src = lobbyPreviewBanner;
              }
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/25 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-gold/5" />
          <div className="absolute bottom-0 left-0 p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/80">
              {t('lobby.heroPremium')}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ivory sm:text-3xl">
              {t('lobby.heroTitle')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted">{t('lobby.heroDesc')}</p>
          </div>
        </motion.div>

        <motion.div
          className="mb-8"
          variants={reduceMotion ? undefined : section}
          custom={1}
        >
          <GlassPanel
            glow={mode === 'JOKER' ? 'emerald' : 'gold'}
            className="relative overflow-hidden border-white/10 p-0 shadow-panel"
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-0',
                mode === 'JOKER'
                  ? 'bg-[radial-gradient(ellipse_at_top_right,rgba(74,222,128,0.07),transparent_55%)]'
                  : 'bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.08),transparent_55%)]'
              )}
            />
            <div
              className={cn(
                'relative h-1 w-full',
                mode === 'JOKER'
                  ? 'bg-gradient-to-r from-transparent via-emerald/80 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-gold/80 to-transparent'
              )}
            />
            <div className="relative flex flex-col gap-4 p-4 sm:p-5">
              <SectionHeader
                compact
                className="mb-0"
                eyebrow={t('lobby.modesEyebrow')}
                title={t('lobby.modesTitle')}
                description={t('lobby.modesDesc')}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ModeCard
                  title={modeTitle('HOLDEM', holdemMode.title)}
                  description={modeDesc('HOLDEM', holdemMode.description)}
                  bannerUrl={holdemMode.imageUrl}
                  icon={<span aria-hidden>♠</span>}
                  selected={mode === 'HOLDEM'}
                  selectedLabel={t('modes.selected')}
                  onClick={() => setMode('HOLDEM')}
                />
                <ModeCard
                  title={modeTitle('JOKER', jokerMode.title)}
                  description={modeDesc('JOKER', jokerMode.description)}
                  bannerUrl={jokerMode.imageUrl}
                  icon={<span aria-hidden>♦</span>}
                  selected={mode === 'JOKER'}
                  selectedLabel={t('modes.selected')}
                  onClick={() => setMode('JOKER')}
                />
              </div>
              {mode === 'JOKER' ? (
                <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-3 text-xs text-subtle sm:text-sm">
                  <p className="text-center">{t('table.jokerPlayerCountHint')}</p>
                  <label className="flex cursor-pointer items-center justify-center gap-2">
                    <input
                      type="checkbox"
                      checked={jokerStrict}
                      onChange={(e) => setJokerStrict(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    <span>{t('lobby.jokerStrict')}</span>
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2">
                    <input
                      type="checkbox"
                      checked={jokerMinusScoring}
                      onChange={(e) => setJokerMinusScoring(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    <span>{t('lobby.jokerMinusScoring')}</span>
                  </label>
                </div>
              ) : null}
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          className="mb-8"
          variants={reduceMotion ? undefined : section}
          custom={2}
        >
          <GlassPanel
            glow={opponentType === 'BOT' ? 'emerald' : 'gold'}
            className="relative overflow-hidden border-white/10 p-0 shadow-panel"
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-0',
                opponentType === 'BOT'
                  ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(74,222,128,0.08),transparent_55%)]'
                  : 'bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.08),transparent_55%)]'
              )}
            />
            <div
              className={cn(
                'relative h-1.5 w-full',
                opponentType === 'BOT'
                  ? 'bg-gradient-to-r from-transparent via-emerald to-transparent shadow-[0_0_16px_rgba(74,222,128,0.35)]'
                  : 'bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_16px_rgba(212,175,55,0.35)]'
              )}
            />
            <div className="relative border-b border-white/10 bg-black/30 px-4 py-3.5 sm:px-6 sm:py-4">
              <SectionHeader
                compact
                className="mb-0"
                eyebrow={t('lobby.opponentEyebrow')}
                title={t('lobby.opponentTitle')}
                description={t('lobby.opponentDesc')}
              />
            </div>
            <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_minmax(0,340px)] lg:items-stretch lg:gap-0">
              <div className="flex flex-col gap-3 lg:pr-5">
                <OpponentSelector
                  showBrand={false}
                  layout="wide"
                  value={opponentType}
                  onChange={setOpponentType}
                  selectedLabel={t('modes.selected')}
                  options={[
                    {
                      id: 'HUMAN',
                      label: t('lobby.opponentHuman'),
                      hint: t('lobby.opponentHumanHint')
                    },
                    {
                      id: 'BOT',
                      label: t('lobby.opponentBot'),
                      hint: t('lobby.opponentBotHint')
                    }
                  ]}
                  className="mb-0 border-0 bg-transparent p-0"
                />
                {opponentType === 'BOT' && mode === 'HOLDEM' ? (
                  <PlayerCountSelector
                    layout="inline"
                    value={botPlayerCount}
                    onChange={setBotPlayerCount}
                    label={t('lobby.botPlayerCount')}
                    hint={t('lobby.botPlayerCountHint')}
                  />
                ) : null}
                {opponentType === 'BOT' && mode === 'JOKER' ? (
                  <p className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-center text-xs text-subtle">
                    {t('lobby.jokerBotPlayerCount')}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col justify-center gap-3 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <Button
                  variant={opponentType === 'BOT' ? 'secondary' : 'primary'}
                  size="lg"
                  className="w-full"
                  disabled={queueBusy}
                  data-testid="lobby-queue-button"
                  onClick={() => void startQueue()}
                >
                  {opponentType === 'BOT'
                    ? mode === 'HOLDEM'
                      ? t('queue.buttonHoldemBot')
                      : t('queue.buttonJokerBot')
                    : mode === 'HOLDEM'
                      ? t('queue.buttonHoldem')
                      : t('queue.buttonJoker')}
                </Button>
                {queueBanner ? (
                  <p
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-xs leading-relaxed',
                      opponentType === 'BOT'
                        ? 'border-emerald/25 bg-emerald/[0.08] text-emerald'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-200/90'
                    )}
                  >
                    {queueBanner}
                  </p>
                ) : null}
                {sessionError ? (
                  <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
                    {translateQueueError(sessionError)}
                  </p>
                ) : null}
                {tableHref ? (
                  <Link to={tableHref} className="block">
                    <Button variant="ghost" size="md" className="w-full">
                      {t('queue.openTable')}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          className="flex flex-col gap-4"
          variants={reduceMotion ? undefined : section}
          custom={3}
        >
            <SectionHeader
              eyebrow={t('lobby.liveEyebrow')}
              title={t('lobby.liveSession')}
              description={t('lobby.liveSessionDesc')}
            />
            <GlassPanel
              glow="emerald"
              className="flex flex-col gap-4 overflow-hidden border-white/10 p-0"
            >
              {session && session.street && session.street !== 'LOBBY' ? (
                <div className="border-b border-white/10 px-4 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                    {t('lobby.table3d')}
                  </p>
                  {reduceMotion ? (
                    <div className="flex h-36 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30">
                      {(session.communityCards ?? []).slice(0, 5).map((c, i) => (
                        <PlayingCard
                          key={`${c}-${i}`}
                          card={c}
                          faceUp
                          deckId={equipped.deck}
                          size="sm"
                        />
                      ))}
                      {(session.communityCards ?? []).length === 0 ? (
                        <PlayingCard faceUp={false} deckId={equipped.deck} size="sm" />
                      ) : null}
                    </div>
                  ) : (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl">
                      <PokerTable3D
                        communityCards={session.communityCards ?? []}
                        pot={kettle}
                        street={session.street}
                        heroDeckId={equipped.deck}
                        heroChipId={equipped.chip}
                        heroTableFeltId={equipped.table}
                      />
                    </div>
                  )}
                </div>
              ) : null}
              {(!session || session.street === 'LOBBY' || !session.street) && (
                <div className="border-b border-white/10 px-4 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                    {t('lobby.lobbyPreview')}
                  </p>
                  <Suspense
                    fallback={
                      <div className="aspect-video w-full animate-pulse rounded-2xl bg-white/5" />
                    }
                  >
                    <LobbyChipPreview />
                  </Suspense>
                </div>
              )}
              <div className="p-4 pt-3">
                {showDevPanel ? (
                  <>
                    <p className="mb-2 text-xs text-subtle">Socket state (dev only)</p>
                    <pre className="max-h-[220px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald/90">
                      {JSON.stringify(session ?? { mode, phase: 'waiting' }, null, 2)}
                    </pre>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    {session
                      ? session.street && session.street !== 'LOBBY'
                        ? t('lobby.sessionStatusCompact', { id: session.sessionId })
                        : t('lobby.sessionStatus', { id: session.sessionId, street: session.street })
                      : t('lobby.queueHint')}
                  </p>
                )}
              </div>
            </GlassPanel>

            {checkoutMsg ? (
              <p className="rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">
                {checkoutMsg}
              </p>
            ) : null}

            <div className="glass-shine relative overflow-hidden rounded-3xl border border-white/10 shadow-panel ring-1 ring-white/5">
              <img
                src={clubsBannerUrl}
                alt=""
                className="block h-36 w-full object-cover object-center sm:h-40"
                loading="lazy"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/55 via-background/15 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent" />
              <div className="absolute bottom-0 left-0 flex w-full flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold/80">
                    {t('lobby.clubsEyebrow')}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-ivory sm:text-2xl">
                    {t('lobby.clubsTitle')}
                  </h2>
                  <p className="mt-2 max-w-lg text-sm text-muted">{t('lobby.clubsDesc')}</p>
                </div>
                <Link to="/clubs" className="shrink-0">
                  <Button variant="primary" size="lg">
                    {t('lobby.myClubs')}
                  </Button>
                </Link>
              </div>
            </div>

            <GlassPanel className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold/80">
                  {t('referral.eyebrow')}
                </p>
                <p className="mt-1 text-sm text-muted">{t('lobby.referralTeaser')}</p>
              </div>
              <Link to="/profile#referrals" className="shrink-0">
                <Button variant="secondary" size="sm">
                  {t('lobby.inviteFriend')}
                </Button>
              </Link>
            </GlassPanel>

            <div id="subscriptions" className="mb-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <SectionHeader
                  eyebrow={t('lobby.subscriptionsEyebrow')}
                  title={t('lobby.subscriptionsTitle')}
                  description={subsExpanded ? t('lobby.subscriptionsDesc') : t('lobby.subscriptionsTeaser')}
                  className="mb-0 flex-1"
                />
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link to="/profile#subscriptions">
                    <Button variant="ghost" size="sm">
                      {t('lobby.subscriptionsAllPlans')}
                    </Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => setSubsExpanded((v) => !v)}>
                    {subsExpanded ? t('lobby.subscriptionsCollapse') : t('lobby.subscriptionsExpand')}
                  </Button>
                </div>
              </div>
              {subsExpanded ? (
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PAID_TIERS.map((tier) => {
                  const active = subscriptionTier === tier;
                  return (
                    <SubscriptionTierCard
                      key={tier}
                      tier={tier}
                      price={subscriptionPriceLabel(tier)}
                      tierName={t(`subscriptions.${tier.toLowerCase()}`)}
                      perkDescription={t(`subscriptions.perkSummary.${tier.toLowerCase()}`)}
                      active={active}
                      featured={tier === 'BLACK'}
                      viewDetailsLabel={t('lobby.subscriptionViewDetails')}
                      onViewDetails={() => setDetailSubTier(tier)}
                      bannerUrl={subBanner(tier)}
                    >
                      <Button
                        variant={active ? 'ghost' : 'secondary'}
                        size="sm"
                        className="w-full"
                        disabled={active || checkoutBusy === tier}
                        onClick={() => void startSubscription(tier)}
                      >
                        {active
                          ? t('lobby.subscriptionActive')
                          : checkoutBusy === tier
                            ? t('lobby.subscribing')
                            : t('lobby.subscribe')}
                      </Button>
                    </SubscriptionTierCard>
                  );
                })}
              </div>
              ) : (
                <GlassPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-gradient-gold">
                      {t(`subscriptions.${(subscriptionTier === 'FREE' ? 'gold' : subscriptionTier.toLowerCase())}`)}
                    </p>
                    <p className="mt-1 text-sm text-muted">{t('lobby.subscriptionsTeaserCta')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/profile#subscriptions">
                      <Button variant="primary" size="sm">
                        {t('lobby.subscriptionsAllPlans')}
                      </Button>
                    </Link>
                    {subscriptionTier === 'FREE' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={checkoutBusy === 'GOLD'}
                        onClick={() => void startSubscription('GOLD')}
                      >
                        {checkoutBusy === 'GOLD' ? t('lobby.subscribing') : t('lobby.subscribe')}
                      </Button>
                    ) : null}
                  </div>
                </GlassPanel>
              )}
              {subsExpanded && detailSubTier ? (
                <SubscriptionDetailModal
                  tier={detailSubTier}
                  open={Boolean(detailSubTier)}
                  onClose={() => setDetailSubTier(null)}
                  tierName={t(`subscriptions.${detailSubTier.toLowerCase()}`)}
                  price={subscriptionPriceLabel(detailSubTier)}
                  perkDescription={t(`subscriptions.perkSummary.${detailSubTier.toLowerCase()}`)}
                  featureBullets={tierPerkBullets(detailSubTier)}
                  bannerUrl={subBanner(detailSubTier)}
                  cosmeticSlotLabels={cosmeticSlotLabels}
                  active={subscriptionTier === detailSubTier}
                  subscribeBusy={checkoutBusy === detailSubTier}
                  onSubscribe={() => void startSubscription(detailSubTier)}
                />
              ) : null}
            </div>
          </motion.div>

        <motion.footer className="mt-8" variants={reduceMotion ? undefined : section} custom={4}>
          <LegalDisclaimer text={t('legal.disclaimer')} />
        </motion.footer>
      </motion.div>
      <PwaInstallHint />
    </div>
  );
};
