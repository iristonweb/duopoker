import { GlassPanel } from './GlassPanel';

export function LegalDisclaimer({ text }: { text?: string }) {
  const content =
    text ??
    'Virtual chips only. No real-money gambling. Virtual chips are not convertible to cash. Purchases are final. Play responsibly.';

  return (
    <GlassPanel className="border-gold/10 bg-black/20 text-xs leading-relaxed text-subtle">
      <p className="flex gap-2">
        <span className="mt-0.5 shrink-0 text-gold/80" aria-hidden>
          ♠
        </span>
        <span>{content}</span>
      </p>
    </GlassPanel>
  );
}
