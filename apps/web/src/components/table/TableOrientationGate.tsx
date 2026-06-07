import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const PORTRAIT_MOBILE = '(max-width: 767px) and (orientation: portrait)';

function usePortraitMobile() {
  const [portrait, setPortrait] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(PORTRAIT_MOBILE).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT_MOBILE);
    const sync = () => setPortrait(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  return portrait;
}

export function TableOrientationGate() {
  const { t } = useTranslation();
  const portrait = usePortraitMobile();

  if (!portrait) return null;

  return (
    <div
      data-testid="table-orientation-gate"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#050508]/98 px-8 text-center backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <motion.div
        animate={{ rotate: [0, -90, -90, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-8 flex h-24 w-14 items-center justify-center rounded-2xl border-2 border-gold/40 bg-white/[0.04] shadow-glow-gold"
        aria-hidden
      >
        <div className="h-16 w-9 rounded-lg border border-gold/30 bg-gradient-to-b from-gold/20 to-transparent" />
      </motion.div>
      <h2 className="font-display text-xl font-semibold text-gradient-gold">{t('table.rotateDevice')}</h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t('table.rotateDeviceHint')}</p>
    </div>
  );
}
