import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GlassPanel, PageShell } from '@duopoker/ui-kit';

function LegalArticle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassPanel className="border-white/10 p-6 sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ivory">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
    </GlassPanel>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold text-zinc-100">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function LegalPrivacy() {
  return (
    <PageShell
      maxWidth="2xl"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          ← Back to lobby
        </Link>
      }
    >
      <LegalArticle title="Privacy">
        <p>
          We collect account identifiers (such as email), gameplay events required to run
          tables, and payment metadata processed by Stripe for subscriptions. We use industry
          standard security for transport and storage. You may request account deletion subject
          to legal retention needs.
        </p>
        <p>
          Analytics and error reporting (for example Sentry) may be enabled when configured by
          your deployment; see deployment documentation for details.
        </p>
        <LegalSection title="Data retention and deletion">
          <p>
            Account data is retained while your account is active. You may request deletion by
            contacting your deployment administrator. Payment records may be retained as required
            by billing providers and applicable law.
          </p>
          <p>
            DuoPoker is a social play-money product. Private club fees purchase access to platform
            tools (club administration, invites, table hosting limits) and do not purchase odds,
            outcomes, or cash prizes. We do not support cashout, rake from pots, or peer-to-peer
            money transfers in product.
          </p>
        </LegalSection>
      </LegalArticle>
    </PageShell>
  );
}
