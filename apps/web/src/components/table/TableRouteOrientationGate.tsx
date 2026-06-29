import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GlassPanel } from '@duopoker/ui-kit';
import { useTableViewport } from '../../hooks/useTableViewport';

function isTableRoute(pathname: string): boolean {
  return /^\/table\/[^/]+/.test(pathname);
}

export function TableRouteOrientationGate() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isPhonePortrait } = useTableViewport();

  const show = isTableRoute(pathname) && isPhonePortrait;

  if (!show) return null;

  return (
    <div
      data-testid="table-orientation-gate"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#050508]/95 px-6 backdrop-blur-md"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <GlassPanel glow="gold" className="max-w-sm border-gold/30 p-8 text-center">
        <motion.div
          animate={{ rotate: [0, -90, -90, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="mx-auto mb-6 flex h-20 w-11 items-center justify-center rounded-2xl border-2 border-gold/40 bg-gold/10 shadow-glow-gold"
          aria-hidden
        >
          <div className="h-14 w-8 rounded-lg border border-gold/30 bg-gradient-to-b from-gold/25 to-transparent" />
        </motion.div>
        <p className="font-display text-xl text-gradient-gold">{t('table.rotateDevice')}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('table.rotateDeviceHint')}</p>
      </GlassPanel>
    </div>
  );
}
