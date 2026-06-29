import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import { useCoachEligibility } from '../../hooks/useCoachEligibility';
import { useAppStore } from '../../store/useAppStore';
import type { SessionState } from '@duopoker/shared-types';

type CoachPanelProps = {
  session: SessionState | undefined;
  heroId: string;
  onClose: () => void;
};

function CoachPanel({ session, heroId, onClose }: CoachPanelProps) {
  const { t } = useTranslation();
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestHint = async () => {
    if (!session || !accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const heroCards = session.playerCards[heroId] ?? [];
      const res = await apiFetch(
        '/coach/hint',
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId: session.sessionId,
            mode: session.mode,
            street: session.street,
            heroCards,
            communityCards: session.communityCards ?? [],
            pot: Object.values(session.handContributions ?? {}).reduce((a, b) => a + b, 0)
          })
        },
        accessToken
      );
      if (!res.ok) {
        setError(t('table.coachError'));
        return;
      }
      const data = (await res.json()) as { hint?: string };
      setHint(data.hint ?? null);
    } catch {
      setError(t('table.coachError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.2 }}
      className="mb-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gold/25 bg-background/95 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80">
          {t('table.coachEyebrow')}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-subtle transition hover:bg-white/5 hover:text-muted"
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      <p className="mb-3 text-xs text-muted">{t('table.coachDisclaimer')}</p>
      <button
        type="button"
        disabled={busy || !session}
        onClick={() => void requestHint()}
        className="w-full rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm font-semibold text-gold-light transition hover:bg-gold/15 disabled:opacity-50"
      >
        {busy ? t('table.coachLoading') : t('table.coachAsk')}
      </button>
      {hint ? <p className="mt-3 text-sm leading-relaxed text-ivory">{hint}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
    </motion.div>
  );
}

type CoachHudButtonProps = {
  session?: SessionState;
  heroId?: string;
  className?: string;
};

export function CoachHudButton({ session, heroId = '', className }: CoachHudButtonProps) {
  const { t } = useTranslation();
  const eligibility = useCoachEligibility();
  const [open, setOpen] = useState(false);
  const checking = eligibility === 'checking';
  const blocked = eligibility === 'unavailable' || eligibility === 'tier_required';

  const handleToggle = () => {
    if (checking || blocked) return;
    setOpen((v) => !v);
  };

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence>
        {open ? (
          <div className="absolute bottom-full right-0 z-50 mb-1">
            <CoachPanel session={session} heroId={heroId} onClose={() => setOpen(false)} />
          </div>
        ) : null}
      </AnimatePresence>
      <button
        type="button"
        title={blocked ? t('table.coachTierRequired') : t('table.coachAsk')}
        aria-label={t('table.coachAsk')}
        disabled={checking || blocked}
        onClick={handleToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border text-sm transition',
          blocked
            ? 'cursor-not-allowed border-white/10 bg-white/5 text-subtle opacity-50'
            : 'border-gold/25 bg-gold/[0.06] text-gold-light hover:border-gold/45 hover:bg-gold/10'
        )}
      >
        ✦
      </button>
    </div>
  );
}
