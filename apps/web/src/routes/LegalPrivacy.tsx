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
          <h2 className="mt-6 text-lg font-semibold text-zinc-100">Data retention and deletion</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Account data is retained while your account is active. You may request deletion by
            contacting your deployment administrator. Payment records may be retained as required
            by billing providers and applicable law.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            DuoPoker is a social play-money product. Private club fees purchase access to platform
            tools (club administration, invites, table hosting limits) and do not purchase odds,
            outcomes, or cash prizes. We do not support cashout, rake from pots, or peer-to-peer
            money transfers in product.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
