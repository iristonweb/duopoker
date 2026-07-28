import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import { VoiceRoom } from '../VoiceRoom';
import { useVoiceEligibility } from '../../hooks/useVoiceEligibility';

function VoiceChatPanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.2 }}
      className="mb-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-emerald/25 bg-background/95 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald/80">
          {t('table.voiceEyebrow')}
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
      <VoiceRoom />
    </motion.div>
  );
}

function useVoiceChatState() {
  const eligibility = useVoiceEligibility();
  const [open, setOpen] = useState(false);
  const checking = eligibility === 'checking';
  const blocked = eligibility === 'unavailable';

  const handleToggle = () => {
    if (checking || blocked) return;
    setOpen((v) => !v);
  };

  return { eligibility, open, setOpen, blocked, checking, handleToggle };
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
    </svg>
  );
}

export function VoiceChatHudButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { open, setOpen, blocked, checking, handleToggle } = useVoiceChatState();

  return (
    <div className={cn('relative max-table-compact:hidden', className)}>
      <AnimatePresence>
        {open && !blocked ? (
          <div className="absolute right-0 top-full z-50 mt-2">
            <VoiceChatPanel onClose={() => setOpen(false)} />
          </div>
        ) : null}
      </AnimatePresence>
      <button
        type="button"
        onClick={handleToggle}
        disabled={checking || blocked}
        title={blocked ? t('voice.unavailable') : t('table.voiceEyebrow')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border shadow-md transition-all',
          blocked && 'cursor-not-allowed opacity-55',
          open && !blocked
            ? 'border-emerald/40 bg-emerald/15 text-emerald'
            : 'border-white/15 bg-black/55 text-muted backdrop-blur-md hover:border-emerald/30 hover:text-emerald'
        )}
        aria-label={checking ? t('voice.checking') : t('table.voiceEyebrow')}
      >
        <MicIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function VoiceChatPill({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { open, setOpen, blocked, checking, handleToggle } = useVoiceChatState();

  return (
    <div
      className={cn('fixed z-50 hidden max-table-compact:block', className)}
      style={{
        bottom: 'calc(var(--table-dock-height, 7.5rem) + 0.75rem)',
        right: 'max(1rem, env(safe-area-inset-right))'
      }}
    >
      <AnimatePresence>
        {open && !blocked ? <VoiceChatPanel onClose={() => setOpen(false)} /> : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleToggle}
        disabled={checking || blocked}
        title={blocked ? t('voice.unavailable') : undefined}
        className={cn(
          'flex max-w-[11rem] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg transition-all',
          blocked && 'cursor-not-allowed opacity-55',
          open && !blocked
            ? 'border-emerald/40 bg-emerald/15 text-emerald'
            : 'border-white/15 bg-black/60 text-muted backdrop-blur-md hover:border-emerald/30 hover:text-emerald'
        )}
      >
        {!blocked ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
          </span>
        ) : (
          <span className="relative inline-flex h-2 w-2 rounded-full bg-subtle" />
        )}
        <span className="truncate">{checking ? t('voice.checking') : t('table.voiceEyebrow')}</span>
      </button>
      {blocked ? (
        <p className="mt-1.5 max-w-[11rem] text-right text-[10px] leading-snug text-subtle">{t('voice.unavailable')}</p>
      ) : null}
    </div>
  );
}
