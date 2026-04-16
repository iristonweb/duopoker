import { Link } from 'react-router-dom';
import { AppBackground, GlassPanel } from '@duopoker/ui-kit';

export function LegalPrivacy() {
  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <Link to="/lobby" className="text-sm text-gold hover:underline">
          ← Back to lobby
        </Link>
        <GlassPanel className="mt-6 border-white/10 p-6">
          <h1 className="text-2xl font-semibold text-zinc-50">Privacy</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            We collect account identifiers (such as email), gameplay events required to run
            tables, and payment metadata processed by Stripe for subscriptions. We use industry
            standard security for transport and storage. You may request account deletion subject
            to legal retention needs.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Analytics and error reporting (for example Sentry) may be enabled when configured by
            your deployment; see deployment documentation for details.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
