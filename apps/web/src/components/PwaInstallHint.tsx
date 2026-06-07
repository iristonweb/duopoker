import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { GlassPanel, cn } from '@duopoker/ui-kit';

const STORAGE_KEY = 'duopoker-pwa-hint-dismissed';

function isMobileBrowser() {
  if (typeof window === 'undefined') return false;
  const narrow = window.matchMedia('(max-width: 767px)').matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return narrow || mobileUa;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallHint({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isMobileBrowser() || isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={cn('pointer-events-auto fixed inset-x-3 z-[100] sm:inset-x-auto sm:right-4 sm:max-w-sm', className)}
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <GlassPanel glow="gold" className="border-gold/30 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/75">
              {t('pwa.installTitle')}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-muted">{t('pwa.installBody')}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full border border-gold/35 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold-light transition hover:bg-gold/20"
              >
                {t('pwa.installDismiss')}
              </button>
            </div>
          </GlassPanel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
