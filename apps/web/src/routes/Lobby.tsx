import { lazy, Suspense, useEffect, useState } from 'react';
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

const LobbyChipPreview = lazy(() => import('../components/LobbyChipPreview'));

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

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

export const Lobby = () => {
  const { mode, setMode, connect, queue, session, loginDemo, userId, readyNextHand } = useAppStore();
  const [cosmetics, setCosmetics] = useState<CosmeticItem[]>([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    fetch(`${API}/monetization/catalog`)
      .then((r) => r.json())
      .then((d: { cosmetics?: CosmeticItem[] }) => setCosmetics(d.cosmetics ?? []))
      .catch(() => undefined);
  }, []);

  const kettle = session
    ? session.pot +
      Object.values(session.playerRoundBet ?? {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
    : 0;

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
          className="mb-10 flex flex-col gap-2 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between"
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
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button variant="secondary" size="md" title="Creates a dev account" onClick={() => loginDemo()}>
              {userId.startsWith('guest') ? 'Sign in (dev)' : `Id ${userId.slice(0, 8)}…`}
            </Button>
            <Button variant="ghost" size="md" title="Settings placeholder">
              Settings
            </Button>
          </div>
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
                description="Open hands and draw rounds — a distinct duel of reads and discards."
                icon={<span aria-hidden>♦</span>}
                selected={mode === 'RASPISNOY'}
                onClick={() => setMode('RASPISNOY')}
              />
            </div>
            <Button variant="primary" size="lg" className="w-full sm:w-auto" onClick={queue}>
              Queue {mode === 'HOLDEM' ? "Hold'em" : 'Raspisnoy'}
            </Button>
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
                <p className="mb-2 text-xs text-subtle">Socket state</p>
                <pre className="max-h-[220px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald/90">
                  {JSON.stringify(session ?? { mode, phase: 'waiting' }, null, 2)}
                </pre>
                {session?.street === 'COMPLETE' ? (
                  <Button variant="secondary" size="sm" className="mt-3" onClick={readyNextHand}>
                    Next hand
                  </Button>
                ) : null}
              </div>
            </GlassPanel>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SubscriptionTierCard tier="SILVER" price="$4.99/mo" />
              <SubscriptionTierCard tier="GOLD" price="$9.99/mo" />
            </div>
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
