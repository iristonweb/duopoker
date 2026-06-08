import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  closeLabel: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function TableBottomSheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  className,
  testId
}: Props) {
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[125] flex items-end justify-center"
          data-testid={testId}
        >
          <button
            type="button"
            aria-label={closeLabel}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'relative z-[1] w-full max-h-[70dvh] overflow-y-auto rounded-t-2xl border border-gold/20 bg-surface px-5 py-4 shadow-panel premium-scroll',
              className
            )}
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" aria-hidden />
            {title ? (
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.28em] text-gold/60">
                {title}
              </p>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
