import { motion } from 'framer-motion';
import { Button } from '@duopoker/ui-kit';

type Props = {
  open: boolean;
  title: string;
  hint: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
};

export function MobileFullscreenPrompt({
  open,
  title,
  hint,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 px-6"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
      data-testid="mobile-fullscreen-prompt"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-gold/25 bg-surface p-6 text-center shadow-panel"
      >
        <h2 className="font-display text-lg font-semibold text-gradient-gold">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{hint}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" className="min-h-[48px]" onClick={onAccept}>
            {acceptLabel}
          </Button>
          <Button variant="secondary" className="min-h-[48px]" onClick={onDecline}>
            {declineLabel}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
