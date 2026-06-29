import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button, cn, GlassPanel } from '@duopoker/ui-kit';

type GlassModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  closeLabel?: string;
  footer?: ReactNode;
  glow?: 'none' | 'gold' | 'emerald';
  className?: string;
  children: ReactNode;
};

export function GlassModal({
  open,
  onClose,
  title,
  eyebrow,
  closeLabel = 'Close',
  footer,
  glow = 'gold',
  className,
  children
}: GlassModalProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="glass-modal-root fixed inset-0 z-modal flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.button
            type="button"
            aria-label={closeLabel}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'glass-modal-title' : undefined}
            className={cn('relative z-[1] flex w-full max-w-2xl flex-col sm:max-h-[min(90vh,820px)]', className)}
            initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel
              glow={glow}
              className="flex max-h-[92vh] flex-col overflow-hidden border-gold/20 p-0 shadow-[0_24px_80px_rgba(0,0,0,0.65),0_0_48px_rgba(232,197,71,0.12)] sm:max-h-[min(90vh,820px)] sm:rounded-3xl"
            >
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-gold/[0.08] via-transparent to-emerald/[0.06] px-5 py-4 sm:px-6">
                <div className="min-w-0 pr-2">
                  {eyebrow ? (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">{eyebrow}</p>
                  ) : null}
                  {title ? (
                    <h2 id="glass-modal-title" className="mt-1 font-display text-xl font-semibold text-ivory sm:text-2xl">
                      {title}
                    </h2>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-full border-white/15 px-3 sm:rounded-xl sm:px-4"
                  onClick={onClose}
                  aria-label={closeLabel}
                >
                  <span aria-hidden>✕</span>
                  <span className="ml-1.5 hidden sm:inline">{closeLabel}</span>
                </Button>
              </div>

              <div className="premium-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                {children}
              </div>

              {footer ? (
                <div className="shrink-0 border-t border-white/10 bg-black/25 px-5 py-4 backdrop-blur-glass sm:px-6">
                  {footer}
                </div>
              ) : null}
            </GlassPanel>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
