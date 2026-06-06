import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  catalogGameModes,
  clubsHeroBanner,
  lobbyHeroBanner,
  subscriptionBannerImages
} from '@duopoker/shared-types';
import {
  AppBackground,
  Button,
  cn,
  DpClubMark,
  GlassPanel,
  Input,
  LegalDisclaimer,
  ModeCard,
  OpponentSelector,
  PlayerCountSelector,
  SectionHeader,
  SkinSelector,
  SubscriptionTierCard,
  TabGroup,
  VoiceChatPanel,
  type CosmeticItem
} from '@duopoker/ui-kit';
import { AppLogo } from '../components/AppLogo';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { PlayingCard } from '../components/cosmetics/PlayingCard';
import { PlayerAvatar } from '../components/cosmetics/PlayerAvatar';
import { PokerChipVisual } from '../components/cosmetics/PokerChipVisual';
import { PokerTable3D } from '../components/PokerTable3D';
import { VoiceRoom } from '../components/VoiceRoom';
import { useAppStore } from '../store/useAppStore';
import { translateAuthError, translateQueueError } from '../lib/translate-store-error';
import { resolveApiUrl, usesRealtimeSocket } from '../config/api';

const LobbyChipPreview = lazy(() => import('../components/LobbyChipPreview'));

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

type CatalogSub = { tier: string; stripePriceId?: string; priceUsd?: number; imageUrl?: string };
type CatalogGameMode = { id: 'HOLDEM' | 'RASPISNOY'; title: string; description: string; imageUrl: string };

function AuthPanel() {
  const { t } = useTranslation();
  const accessToken = useAppStore((s) => s.accessToken);
  const userId = useAppStore((s) => s.userId);
  const userRole = useAppStore((s) => s.userRole);
  const email = useAppStore((s) => s.email);
  const displayName = useAppStore((s) => s.displayName);
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
  const [busy, setBusy] = useState(false);

  if (accessToken) {
    return (
      <GlassPanel glow="gold" className="w-full max-w-sm border-gold/20 p-4 sm:max-w-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <PlayerAvatar
              name={displayName ?? t('auth.player')}
              frameId={equipped.frame}
              tier={subscriptionTier}
              size="sm"
              showTier
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/70">
                  {t('auth.welcomeBack')}
                </p>
                {userRole === 'SUPERADMIN' ? (
                  <Link
                    to="/admin"
                    className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-light"
                  >
                    {t('auth.adminBadge')}
                  </Link>
                ) : null}
              </div>
              <p className="truncate font-display text-lg font-semibold text-ivory" title={email ?? undefined}>
                {displayName ?? t('auth.player')}
              </p>
              {chips != null ? (
                <div className="mt-1 flex items-center gap-2">
                  <PokerChipVisual chipId={equipped.chip} size="sm" />
                  <p className="text-sm text-emerald">
                    <span className="font-mono font-medium">{chips.toLocaleString()}</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()}>
            {t('auth.signOut')}
          </Button>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-4">
          <PlayingCard faceUp={false} deckId={equipped.deck} size="sm" />
          <PlayingCard faceUp={false} deckId={equipped.deck} size="sm" />
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel glow="gold" className="w-full max-w-sm border-gold/15 p-5 sm:max-w-md">
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
        <p className="mb-3 rounded-lg border border-emerald/20 bg-emerald/10 px-3 py-2 text-xs text-emerald">
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
              await register(emailIn, passwordIn, name);
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
          <Input
            label={t('auth.displayName')}
            placeholder={t('auth.displayNamePlaceholder')}
            minLength={2}
            value={nameIn}
            onChange={(e) => setNameIn(e.target.value)}
          />
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
  const { mode, setMode, opponentType, setOpponentType, botPlayerCount, setBotPlayerCount, connect, queue, pollQueueStatus, session, fetchProfile } =
    useAppStore();
  const accessToken = useAppStore((s) => s.accessToken);
  const sessionError = useAppStore((s) => s.sessionError);
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const equipped = useAppStore((s) => s.equipped);
  const inventory = useAppStore((s) => s.inventory);
  const equipCosmetic = useAppStore((s) => s.equipCosmetic);
  const socket = useAppStore((s) => s.socket);
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [catalogSubs, setCatalogSubs] = useState<CatalogSub[]>([]);
  const [gameModes, setGameModes] = useState<CatalogGameMode[]>(catalogGameModes);
  const [lobbyBannerUrl, setLobbyBannerUrl] = useState(lobbyHeroBanner);
  const [clubsBannerUrl, setClubsBannerUrl] = useState(clubsHeroBanner);
  const [catalogMockCheckout, setCatalogMockCheckout] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [queueBanner, setQueueBanner] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const queuePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceMotion = useReducedMotion();
  const showDevPanel = import.meta.env.DEV;

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!usesRealtimeSocket() || !socket) return;
    const onWait = () => setQueueBanner(t('queue.waitingSocket'));
    const onFound = () => setQueueBanner(null);
    socket.on('matchmakingWaiting', onWait);
    socket.on('matchFound', onFound);
    return () => {
      socket.off('matchmakingWaiting', onWait);
      socket.off('matchFound', onFound);
    };
  }, [socket, t]);

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
    useAppStore.setState({ sessionError: undefined });
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
          setQueueBanner(t('queue.waiting'));
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
      useAppStore.setState({ sessionError: 'queue_failed' });
    } finally {
      setQueueBusy(false);
    }
  };

  useEffect(() => {
    fetch(resolveApiUrl('/monetization/catalog'))
      .then((r) => r.json())
      .then(
        (d: {
          cosmetics?: CosmeticItem[];
          subscriptions?: CatalogSub[];
          gameModes?: CatalogGameMode[];
          lobbyBannerUrl?: string;
          clubsBannerUrl?: string;
          mockCheckout?: boolean;
        }) => {
          setCosmetics(d.cosmetics ?? []);
          setCatalogSubs(d.subscriptions ?? []);
          if (d.gameModes?.length) setGameModes(d.gameModes);
          if (d.lobbyBannerUrl) setLobbyBannerUrl(d.lobbyBannerUrl);
          if (d.clubsBannerUrl) setClubsBannerUrl(d.clubsBannerUrl);
          setCatalogMockCheckout(Boolean(d.mockCheckout));
        }
      )
      .catch(() => undefined);
  }, []);

  const startSubscription = async (tier: string) => {
    const sub = catalogSubs.find((s) => s.tier === tier);
    const priceId = sub?.stripePriceId ?? (catalogMockCheckout ? tier : undefined);
    const token = useAppStore.getState().accessToken;
    if (!token) {
      setCheckoutMsg(t('lobby.signInToSubscribe'));
      return;
    }
    if (!priceId) {
      setCheckoutMsg(t('lobby.stripeNotConfigured'));
      return;
    }
    setCheckoutMsg(null);
    try {
      const res = await fetch(resolveApiUrl('/monetization/checkout-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ priceId, mode: 'subscription' })
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setCheckoutMsg(data.error ?? t('queue.failed'));
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setCheckoutMsg(t('lobby.networkError'));
    }
  };

  const kettle = session
    ? session.pot +
      Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
    : 0;

  const tableHref = session?.sessionId ? `/table/${session.sessionId}` : null;

  const holdemMode = gameModes.find((m) => m.id === 'HOLDEM') ?? catalogGameModes[0];
  const raspisnoyMode = gameModes.find((m) => m.id === 'RASPISNOY') ?? catalogGameModes[1];
  const modeTitle = (id: 'HOLDEM' | 'RASPISNOY', fallback: string) => t(`modes.${id}.title`, { defaultValue: fallback });
  const modeDesc = (id: 'HOLDEM' | 'RASPISNOY', fallback: string) => t(`modes.${id}.desc`, { defaultValue: fallback });
  const subBanner = (tier: keyof typeof subscriptionBannerImages) =>
    catalogSubs.find((s) => s.tier === tier)?.imageUrl ?? subscriptionBannerImages[tier];

  return (
    <div className="relative min-h-screen">
      <AppBackground />

      <motion.div
        className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-8"
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
        variants={reduceMotion ? undefined : container}
      >
        <motion.header
          className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between"
          variants={reduceMotion ? undefined : section}
          custom={0}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <AppLogo size="lg" className="self-start" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
                {t('brand.eyebrow')}
              </p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ivory sm:text-4xl">
                {t('brand.title')}
                <span className="text-gradient-gold">{t('brand.titleGold')}</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{t('brand.tagline')}</p>
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
              </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <LanguageSwitch className="self-end" />
            <AuthPanel />
          </div>
        </motion.header>

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
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/25 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-gold/5" />
          <div className="absolute bottom-0 left-0 p-6 sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold/80">
              {t('lobby.heroPremium')}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ivory sm:text-3xl">{t('lobby.heroTitle')}</h2>
            <p className="mt-2 max-w-md text-sm text-muted">{t('lobby.heroDesc')}</p>
          </div>
        </motion.div>

        <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-12">
          <motion.div className="flex flex-col gap-4 lg:col-span-5" variants={reduceMotion ? undefined : section} custom={1}>
            <SectionHeader
              eyebrow={t('lobby.modesEyebrow')}
              title={t('lobby.modesTitle')}
              description={t('lobby.modesDesc')}
            />
            <div className="flex flex-col gap-4">
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
                title={modeTitle('RASPISNOY', raspisnoyMode.title)}
                description={modeDesc('RASPISNOY', raspisnoyMode.description)}
                bannerUrl={raspisnoyMode.imageUrl}
                icon={<span aria-hidden>♦</span>}
                selected={mode === 'RASPISNOY'}
                selectedLabel={t('modes.selected')}
                onClick={() => setMode('RASPISNOY')}
              />
            </div>
            <GlassPanel
              glow={opponentType === 'BOT' ? 'emerald' : 'gold'}
              className="relative mt-2 overflow-hidden border-white/10 p-0"
            >
              <div
                className={cn(
                  'h-1.5 w-full',
                  opponentType === 'BOT'
                    ? 'bg-gradient-to-r from-transparent via-emerald to-transparent'
                    : 'bg-gradient-to-r from-transparent via-gold to-transparent'
                )}
              />
              <div className="relative border-b border-white/10 bg-gradient-to-br from-black/50 via-black/30 to-black/50 px-4 py-5 sm:px-6">
                <div
                  className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full blur-3xl"
                  style={{
                    background:
                      opponentType === 'BOT'
                        ? 'radial-gradient(circle, rgba(74,222,128,0.12), transparent 70%)'
                        : 'radial-gradient(circle, rgba(232,197,71,0.14), transparent 70%)'
                  }}
                  aria-hidden
                />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
                      {t('lobby.opponentEyebrow')}
                    </p>
                    <h3 className="mt-1 font-display text-xl font-semibold text-ivory sm:text-2xl">
                      {t('lobby.opponentTitle')}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-subtle">{t('lobby.opponentDesc')}</p>
                  </div>
                  <DpClubMark size="md" variant={opponentType === 'BOT' ? 'emerald' : 'gold'} className="shrink-0" />
                </div>
              </div>
              <div className="space-y-4 bg-black/15 p-4 sm:p-6">
              <OpponentSelector
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
              {opponentType === 'BOT' ? (
                <PlayerCountSelector
                  value={botPlayerCount}
                  onChange={setBotPlayerCount}
                  label={t('lobby.botPlayerCount')}
                  hint={t('lobby.botPlayerCountHint')}
                />
              ) : null}
              <Button
                variant={opponentType === 'BOT' ? 'secondary' : 'primary'}
                size="lg"
                className="w-full"
                disabled={queueBusy}
                onClick={() => void startQueue()}
              >
                {opponentType === 'BOT'
                  ? mode === 'HOLDEM'
                    ? t('queue.buttonHoldemBot')
                    : t('queue.buttonRaspisnoyBot')
                  : mode === 'HOLDEM'
                    ? t('queue.buttonHoldem')
                    : t('queue.buttonRaspisnoy')}
              </Button>
              {queueBanner ? (
                <p
                  className={cn(
                    'mt-3 rounded-xl border px-3 py-2.5 text-xs leading-relaxed',
                    opponentType === 'BOT'
                      ? 'border-emerald/25 bg-emerald/[0.08] text-emerald'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-200/90'
                  )}
                >
                  {queueBanner}
                </p>
              ) : null}
              {sessionError ? (
                <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
                  {translateQueueError(sessionError)}
                </p>
              ) : null}
              {tableHref ? (
                <Link to={tableHref} className="mt-3 block">
                  <Button variant="ghost" size="md" className="w-full">
                    {t('queue.openTable')}
                  </Button>
                </Link>
              ) : null}
              </div>
            </GlassPanel>
          </motion.div>

          <motion.div className="flex flex-col gap-4 lg:col-span-7" variants={reduceMotion ? undefined : section} custom={2}>
            <SectionHeader
              eyebrow={t('lobby.liveEyebrow')}
              title={t('lobby.liveSession')}
              description={t('lobby.liveSessionDesc')}
            />
            <GlassPanel glow="emerald" className="flex flex-col gap-4 overflow-hidden border-white/10 p-0">
              {session && session.street && session.street !== 'LOBBY' ? (
                <div className="border-b border-white/10 px-4 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">{t('lobby.table3d')}</p>
                  {reduceMotion ? (
                    <div className="flex h-36 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30">
                      {(session.communityCards ?? []).slice(0, 5).map((c, i) => (
                        <PlayingCard key={`${c}-${i}`} card={c} faceUp deckId={equipped.deck} size="sm" />
                      ))}
                      {(session.communityCards ?? []).length === 0 ? (
                        <PlayingCard faceUp={false} deckId={equipped.deck} size="sm" />
                      ) : null}
                    </div>
                  ) : (
                    <PokerTable3D
                      communityCards={session.communityCards ?? []}
                      pot={kettle}
                      street={session.street}
                      heroDeckId={equipped.deck}
                      heroChipId={equipped.chip}
                    />
                  )}
                </div>
              ) : null}
              {(!session || session.street === 'LOBBY' || !session.street) && (
                <div className="border-b border-white/10 px-4 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                    {t('lobby.lobbyPreview')}
                  </p>
                  <Suspense fallback={<div className="aspect-video w-full animate-pulse rounded-2xl bg-white/5" />}>
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
                      ? t('lobby.sessionStatus', { id: session.sessionId, street: session.street })
                      : t('lobby.queueHint')}
                  </p>
                )}
              </div>
            </GlassPanel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SubscriptionTierCard
                tier="SILVER"
                price={t('subscriptions.priceSilver')}
                tierName={t('subscriptions.silver')}
                perkDescription={t('subscriptions.perks')}
                bannerUrl={subBanner('SILVER')}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => void startSubscription('SILVER')}
                >
                  {t('lobby.subscribe')}
                </Button>
              </SubscriptionTierCard>
              <SubscriptionTierCard
                tier="GOLD"
                price={t('subscriptions.priceGold')}
                tierName={t('subscriptions.gold')}
                perkDescription={t('subscriptions.perks')}
                bannerUrl={subBanner('GOLD')}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => void startSubscription('GOLD')}
                >
                  {t('lobby.subscribe')}
                </Button>
              </SubscriptionTierCard>
              <SubscriptionTierCard
                tier="PLATINUM"
                price={t('subscriptions.pricePlatinum')}
                tierName={t('subscriptions.platinum')}
                perkDescription={t('subscriptions.perks')}
                bannerUrl={subBanner('PLATINUM')}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => void startSubscription('PLATINUM')}
                >
                  {t('lobby.subscribe')}
                </Button>
              </SubscriptionTierCard>
              <SubscriptionTierCard
                tier="ROYAL"
                price={t('subscriptions.priceRoyal')}
                tierName={t('subscriptions.royal')}
                perkDescription={t('subscriptions.perks')}
                bannerUrl={subBanner('ROYAL')}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => void startSubscription('ROYAL')}
                >
                  {t('lobby.subscribe')}
                </Button>
              </SubscriptionTierCard>
            </div>
            {checkoutMsg ? <p className="text-xs text-amber-400">{checkoutMsg}</p> : null}
          </motion.div>
        </div>

        <motion.div
          className="glass-shine relative mt-12 overflow-hidden rounded-3xl border border-white/10 shadow-panel ring-1 ring-white/5"
          variants={reduceMotion ? undefined : section}
          custom={2.5}
        >
          <img
            src={clubsBannerUrl}
            alt=""
            className="block h-44 w-full object-cover object-center sm:h-52"
            loading="lazy"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/55 via-background/15 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/25 to-transparent" />
          <div className="absolute bottom-0 left-0 flex w-full flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold/80">
                {t('lobby.clubsEyebrow')}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-ivory sm:text-2xl">{t('lobby.clubsTitle')}</h2>
              <p className="mt-2 max-w-lg text-sm text-muted">{t('lobby.clubsDesc')}</p>
            </div>
            <Link to="/clubs" className="shrink-0">
              <Button variant="primary" size="lg">
                {t('lobby.myClubs')}
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2"
          variants={reduceMotion ? undefined : section}
          custom={3}
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
              void useAppStore
                .getState()
                .buyCosmetic(itemId)
                .catch(() => setCheckoutMsg(t('lobby.checkoutFailed')));
            }}
          />
          <VoiceChatPanel
            eyebrow={t('voice.eyebrow')}
            title={t('voice.title')}
            description={t('voice.desc')}
            betaLabel={t('voice.beta')}
          >
            <VoiceRoom />
          </VoiceChatPanel>
        </motion.div>

        <motion.footer
          className="mt-8"
          variants={reduceMotion ? undefined : section}
          custom={4}
        >
          <LegalDisclaimer text={t('legal.disclaimer')} />
        </motion.footer>
      </motion.div>
    </div>
  );
};
