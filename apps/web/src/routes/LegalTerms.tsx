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

export function LegalTerms() {
  return (
    <PageShell
      maxWidth="2xl"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          ← Back to lobby
        </Link>
      }
    >
      <LegalArticle title="Terms of use">
        <p>
          DuoPoker provides entertainment-only poker with virtual chips. No real-money gambling is
          offered. Virtual currency cannot be withdrawn, exchanged for fiat, or transferred for
          value except as permitted in-app for cosmetics and subscriptions. You must meet the
          minimum age required in your jurisdiction to use the service.
        </p>
        <p>
          We may update these terms; continued use constitutes acceptance. For support, contact
          your deployment administrator.
        </p>
        <LegalSection title="Organizer policy">
          <p>
            Private club subscriptions unlock organizer tools (member limits, moderation, scheduling).
            They do not purchase game outcomes, odds, or cash prizes. No rake, cashout, or peer-to-peer
            money transfers are supported.
          </p>
        </LegalSection>
      </LegalArticle>
    </PageShell>
  );
}
