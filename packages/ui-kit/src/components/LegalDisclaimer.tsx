import { GlassPanel } from './GlassPanel';

export function LegalDisclaimer() {
  return (
    <GlassPanel className="border-gold/10 bg-black/20 text-xs leading-relaxed text-subtle">
      <p className="flex gap-2">
        <span className="mt-0.5 shrink-0 text-gold/80" aria-hidden>
          ♠
        </span>
        <span>
          <strong className="font-medium text-muted">Virtual chips only.</strong> No real-money gambling.
          Virtual chips are not convertible to cash. No payouts, no rake, and no peer-to-peer money
          transfers are supported in product. Purchases are final. Play responsibly.
        </span>
      </p>
    </GlassPanel>
  );
}
