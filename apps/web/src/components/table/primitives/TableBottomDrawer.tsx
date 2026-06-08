import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@duopoker/ui-kit';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  testId?: string;
  noBlur?: boolean;
  maxHeight?: 'default' | 'tall';
};

export function TableBottomDrawer({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  className,
  testId,
  noBlur = false,
  maxHeight = 'default'
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-end justify-center"
          data-testid={testId}
        >
          <button
            type="button"
            aria-label={closeLabel}
            className={cn('absolute inset-0', noBlur ? 'bg-black/60' : 'bg-black/55 backdrop-blur-sm')}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn(
              'relative z-[1] flex w-full flex-col rounded-t-2xl border border-gold/25 bg-surface shadow-panel',
              maxHeight === 'tall' ? 'max-h-[85dvh]' : 'max-h-[40dvh]',
              className
            )}
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 flex-col items-center pt-2">
              <div className="mb-2 h-1 w-10 rounded-full bg-white/20" aria-hidden />
              <div className="flex w-full items-center justify-between border-b border-white/10 px-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold/75">{title}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] rounded-lg px-2 text-sm text-subtle transition hover:bg-white/5 hover:text-muted"
                >
                  {closeLabel}
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto premium-scroll">{children}</div>
            {footer ? <div className="shrink-0 border-t border-white/10 px-4 py-3">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
