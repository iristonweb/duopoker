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
          DuoPoker provides entertainment-only poker with virtual chips. No real-money gambling,
          rake, or cash prizes are offered. Virtual currency cannot be withdrawn, exchanged for
          fiat, or transferred for value except as permitted in-app for cosmetics and subscriptions.
        </p>
        <p>
          You must be at least 18 years old (or the minimum age in your jurisdiction) to use the
          service. These terms are governed by the laws of the Russian Federation unless mandatory
          local law requires otherwise.
        </p>
        <p>
          We may update these terms; continued use constitutes acceptance. Support: [support@TBD].
        </p>
        <LegalSection title="Play-money only">
          <p>
            All table play uses virtual chips with no monetary value. DuoPoker does not operate as a
            gambling operator, bookmaker, or payment intermediary for player funds.
          </p>
        </LegalSection>
        <LegalSection title="Organizer subscriptions">
          <p>
            Private club fees purchase access to organizer tools (member limits, moderation,
            scheduling). See the{' '}
            <Link to="/legal/organizer" className="premium-link">
              Organizer policy
            </Link>{' '}
            for details. No rake, cashout, or peer-to-peer money transfers are supported.
          </p>
        </LegalSection>
      </LegalArticle>
    </PageShell>
  );
}
