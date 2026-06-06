import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';
import { VoiceRoom } from '../VoiceRoom';
import { useVoiceAvailability } from '../../hooks/useVoiceAvailability';

export function VoiceChatPill({ className }: { className?: string }) {
  const { t } = useTranslation();
  const availability = useVoiceAvailability();
  const [open, setOpen] = useState(false);
  const unavailable = availability === 'unavailable';
  const checking = availability === 'checking';

  const handleToggle = () => {
    if (checking || unavailable) return;
    setOpen((v) => !v);
  };

  return (
    <div
      className={cn('fixed z-50', className)}
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', right: 'max(1rem, env(safe-area-inset-right))' }}
    >
      <AnimatePresence>
        {open && !unavailable ? (
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
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-subtle transition hover:bg-white/5 hover:text-muted"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <VoiceRoom />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={handleToggle}
        disabled={checking || unavailable}
        title={unavailable ? t('voice.unavailable') : undefined}
        className={cn(
          'flex max-w-[11rem] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg transition-all',
          unavailable && 'cursor-not-allowed opacity-55',
          open && !unavailable
            ? 'border-emerald/40 bg-emerald/15 text-emerald'
            : 'border-white/15 bg-black/60 text-muted backdrop-blur-md hover:border-emerald/30 hover:text-emerald'
        )}
      >
        {!unavailable ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
          </span>
        ) : (
          <span className="relative inline-flex h-2 w-2 rounded-full bg-subtle" />
        )}
        <span className="truncate">{checking ? t('voice.checking') : t('table.voiceEyebrow')}</span>
      </button>
      {unavailable ? (
        <p className="mt-1.5 max-w-[11rem] text-right text-[10px] leading-snug text-subtle">{t('voice.unavailable')}</p>
      ) : null}
    </div>
  );
}
