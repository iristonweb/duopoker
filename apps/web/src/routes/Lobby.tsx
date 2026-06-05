import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  AppBackground,
  Button,
  GlassPanel,
  LegalDisclaimer,
  ModeCard,
  SkinSelector,
  SubscriptionTierCard,
  VoiceChatPanel,
  type CosmeticItem
} from '@duopoker/ui-kit';
import { PokerTable3D } from '../components/PokerTable3D';
import { VoiceRoom } from '../components/VoiceRoom';
import { useAppStore } from '../store/useAppStore';
import { getApiBase, isBackendConfigured } from '../config/api';

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

type CatalogSub = { tier: string; stripePriceId?: string; priceUsd?: number };

function AuthPanel() {
  const accessToken = useAppStore((s) => s.accessToken);
  const userId = useAppStore((s) => s.userId);
  const email = useAppStore((s) => s.email);
  const displayName = useAppStore((s) => s.displayName);
  const chips = useAppStore((s) => s.chips);
  const authError = useAppStore((s) => s.authError);
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
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <p className="max-w-xs truncate text-right text-xs text-muted" title={email}>
          {displayName ?? 'Player'} · {chips != null ? `${chips.toLocaleString()} chips` : ''}
        </p>
        <Button variant="secondary" size="md" onClick={() => logout()}>
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <GlassPanel className="w-full max-w-sm border-white/10 p-4 sm:max-w-md">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-medium ${tab === 'login' ? 'bg-gold/20 text-gold' : 'text-muted'}`}
          onClick={() => setTab('login')}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-xs font-medium ${tab === 'register' ? 'bg-gold/20 text-gold' : 'text-muted'}`}
          onClick={() => setTab('register')}
        >
          Register
        </button>
      </div>
      {authError ? <p className="mb-2 text-xs text-rose-400">{authError}</p> : null}
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            if (tab === 'register') {
              await register(emailIn, passwordIn, nameIn || 'Player');
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
          <input
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-muted"
            placeholder="Display name"
            value={nameIn}
            onChange={(e) => setNameIn(e.target.value)}
          />
        ) : null}
        <input
          required
          type="email"
          autoComplete="email"
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-muted"
          placeholder="Email"
          value={emailIn}
          onChange={(e) => setEmailIn(e.target.value)}
        />
        <input
          required
          type="password"
          autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
          minLength={8}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-muted"
          placeholder="Password (8+ chars)"
          value={passwordIn}
          onChange={(e) => setPasswordIn(e.target.value)}
        />
        <Button variant="primary" size="md" type="submit" disabled={busy}>
          {tab === 'register' ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      <p className="mt-2 text-xs text-subtle">
        {!accessToken ? (
          <>
            Playing as <span className="font-mono text-zinc-400">{userId.slice(0, 18)}…</span> — sign in to save
            progress.
          </>
        ) : null}
      </p>
    </GlassPanel>
  );
}

export const Lobby = () => {
  const { mode, setMode, connect, queue, session, readyNextHand, fetchProfile } = useAppStore();
  const socket = useAppStore((s) => s.socket);
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const [catalogSubs, setCatalogSubs] = useState<CatalogSub[]>([]);
  const [catalogMockCheckout, setCatalogMockCheckout] = useState(false);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [queueBanner, setQueueBanner] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const showDevPanel = import.meta.env.DEV;

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!socket) return;
    const onWait = () => setQueueBanner('Waiting for another player in the queue…');
    const onFound = () => setQueueBanner(null);
    socket.on('matchmakingWaiting', onWait);
    socket.on('matchFound', onFound);
    return () => {
      socket.off('matchmakingWaiting', onWait);
      socket.off('matchFound', onFound);
    };
  }, [socket]);

  useEffect(() => {
    const base = getApiBase();
    if (!base) return;
    fetch(`${base}/monetization/catalog`)
      .then((r) => r.json())
      .then(
        (d: {
          cosmetics?: CosmeticItem[];
          subscriptions?: CatalogSub[];
          mockCheckout?: boolean;
        }) => {
          setCosmetics(d.cosmetics ?? []);
          setCatalogSubs(d.subscriptions ?? []);
          setCatalogMockCheckout(Boolean(d.mockCheckout));
        }
      )
      .catch(() => undefined);
  }, []);

  const startSubscription = async (tier: string) => {
    const base = getApiBase();
    const sub = catalogSubs.find((s) => s.tier === tier);
    const priceId = sub?.stripePriceId ?? (catalogMockCheckout ? tier : undefined);
    const token = useAppStore.getState().accessToken;
    if (!token) {
      setCheckoutMsg('Sign in to subscribe.');
      return;
    }
    if (!base) {
      setCheckoutMsg('Set VITE_API_URL to your backend URL and redeploy.');
      return;
    }
    if (!priceId) {
      setCheckoutMsg('Stripe price is not configured on the server (STRIPE_PRICE_* env).');
      return;
    }
    setCheckoutMsg(null);
    try {
      const res = await fetch(`${base}/monetization/checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ priceId, mode: 'subscription' })
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setCheckoutMsg(data.error ?? 'Checkout failed');
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setCheckoutMsg('Network error');
    }
  };

  const kettle = session
    ? session.pot +
      Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
    : 0;

  const tableHref = session?.sessionId ? `/table/${session.sessionId}` : null;

  return (
    <div className="relative min-h-screen">
      <AppBackground />

      <motion.div
        className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-8"
        initial={reduceMotion ? false : 'hidden'}
        animate="show"
        variants={reduceMotion ? undefined : container}
      >
        {!isBackendConfigured() ? (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-500/35 bg-amber-950/50 px-4 py-3 text-sm text-amber-100"
          >
            <p className="font-medium text-amber-50">API not configured for this deployment</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-100/90">
              Vercel only hosts the static frontend. Add{' '}
              <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[0.8rem]">VITE_API_URL</code>{' '}
              in Project → Settings → Environment Variables (value = your backend origin, e.g.{' '}
              <span className="font-mono text-zinc-200">https://your-api.onrender.com</span>), then redeploy.
              Leaving <code className="font-mono text-[0.75rem]">VITE_API_URL</code> empty causes requests to hit this
              site and return 404 — do not leave it blank.
            </p>
          </div>
        ) : null}
        <motion.header
          className="mb-10 flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between"
          variants={reduceMotion ? undefined : section}
          custom={0}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold/80">
              Poker Duality
            </p>
            <h1 className="mt-1 font-sans text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              Duo<span className="text-gold">Poker</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Premium tables for Texas Hold&apos;em and Raspisnoy — real-time multiplayer, virtual
              chips only.
            </p>
            <div className="mt-3 flex gap-4 text-xs">
              <Link to="/legal/terms" className="text-gold/80 hover:underline">
                Terms
              </Link>
              <Link to="/legal/privacy" className="text-gold/80 hover:underline">
                Privacy
              </Link>
            </div>
          </div>
          <AuthPanel />
        </motion.header>

        <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-12">
          <motion.div className="flex flex-col gap-4 lg:col-span-5" variants={reduceMotion ? undefined : section} custom={1}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">Game mode</h2>
            <div className="flex flex-col gap-4">
              <ModeCard
                title="Texas Hold'em"
                description="No-limit cadence, community cards, and classic showdown tension."
                icon={<span aria-hidden>♠</span>}
                selected={mode === 'HOLDEM'}
                onClick={() => setMode('HOLDEM')}
              />
              <ModeCard
                title="Расписной покер"
                description="Five-card duel: antes, one betting round, best hand wins — fast reads, no community board."
                icon={<span aria-hidden>♦</span>}
                selected={mode === 'RASPISNOY'}
                onClick={() => setMode('RASPISNOY')}
              />
            </div>
            <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={queue}>
              Queue {mode === 'HOLDEM' ? "Hold'em" : 'Raspisnoy'}
            </Button>
            {queueBanner ? <p className="text-xs text-amber-400/90">{queueBanner}</p> : null}
            {tableHref ? (
              <Link to={tableHref}>
                <Button variant="secondary" size="md" className="mt-2 w-full sm:w-auto">
                  Open table view
                </Button>
              </Link>
            ) : null}
          </motion.div>

          <motion.div className="flex flex-col gap-4 lg:col-span-7" variants={reduceMotion ? undefined : section} custom={2}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-subtle">Session</h2>
            <GlassPanel className="flex flex-col gap-4 border-white/10 p-0 overflow-hidden">
              {!reduceMotion && session && session.street && session.street !== 'LOBBY' ? (
                <div className="border-b border-white/10 px-4 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                    Table (3D)
                  </p>
                  <PokerTable3D
                    communityCards={session.communityCards ?? []}
                    pot={kettle}
                    street={session.street}
                  />
                </div>
              ) : null}
              {!reduceMotion && (!session || session.street === 'LOBBY' || !session.street) && (
                <div className="border-b border-white/10 px-4 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
                    Lobby preview
                  </p>
                  <Suspense fallback={<div className="h-36 w-full animate-pulse rounded-2xl bg-white/5" />}>
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
                      ? `Table ${session.sessionId} — ${session.street}`
                      : 'Queue for a match to start a session.'}
                  </p>
                )}
                {session?.street === 'COMPLETE' ? (
                  <Button variant="secondary" size="sm" className="mt-3" onClick={readyNextHand}>
                    Next hand
                  </Button>
                ) : null}
              </div>
            </GlassPanel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SubscriptionTierCard tier="SILVER" price="$4.99/mo">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => void startSubscription('SILVER')}
                >
                  Subscribe
                </Button>
              </SubscriptionTierCard>
              <SubscriptionTierCard tier="GOLD" price="$9.99/mo">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => void startSubscription('GOLD')}
                >
                  Subscribe
                </Button>
              </SubscriptionTierCard>
            </div>
            {checkoutMsg ? <p className="text-xs text-amber-400">{checkoutMsg}</p> : null}
          </motion.div>
        </div>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2"
          variants={reduceMotion ? undefined : section}
          custom={3}
        >
          <SkinSelector catalog={cosmetics} />
          <VoiceChatPanel>
            <VoiceRoom />
          </VoiceChatPanel>
        </motion.div>

        <motion.footer
          className="mt-8"
          variants={reduceMotion ? undefined : section}
          custom={4}
        >
          <LegalDisclaimer />
        </motion.footer>
      </motion.div>
    </div>
  );
};
