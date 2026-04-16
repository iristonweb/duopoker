import { Link } from 'react-router-dom';
import { AppBackground, GlassPanel } from '@duopoker/ui-kit';

export function LegalTerms() {
  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <Link to="/lobby" className="text-sm text-gold hover:underline">
          ← Back to lobby
        </Link>
        <GlassPanel className="mt-6 border-white/10 p-6">
          <h1 className="text-2xl font-semibold text-zinc-50">Terms of use</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            DuoPoker provides entertainment-only poker with virtual chips. No real-money gambling is
            offered. Virtual currency cannot be withdrawn, exchanged for fiat, or transferred for
            value except as permitted in-app for cosmetics and subscriptions. You must meet the
            minimum age required in your jurisdiction to use the service.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            We may update these terms; continued use constitutes acceptance. For support, contact
            your deployment administrator.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
