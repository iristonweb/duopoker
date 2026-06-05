import { GlassPanel } from './GlassPanel';

export function LegalDisclaimer() {
  return (
    <GlassPanel className="border-white/[0.08] text-xs leading-relaxed text-subtle">
      <p>
        <strong className="text-muted">Virtual chips only.</strong> No real-money gambling. Virtual
        chips are not convertible to cash. No payouts, no rake, and no peer-to-peer money transfers
        are supported in product. Purchases are final. Play responsibly.
      </p>
    </GlassPanel>
  );
}
