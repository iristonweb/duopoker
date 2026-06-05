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

export function LegalCommunity() {
  return (
    <PageShell
      maxWidth="2xl"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          ← Back to lobby
        </Link>
      }
    >
      <LegalArticle title="Community rules">
        <p>
          DuoPoker is a social play-money platform. All participants must treat others with respect
          and use the product for entertainment only.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>No real-money betting, cashout requests, or peer-to-peer fund transfers.</li>
          <li>No harassment, hate speech, cheating, collusion, or bot abuse.</li>
          <li>No attempts to use club tools for gambling operations or payout handling.</li>
          <li>Report suspicious behavior to your deployment administrator.</li>
        </ul>
        <p>
          Violations may result in account suspension, club removal, or permanent bans. Organizers
          are responsible for moderating their private clubs within these rules.
        </p>
      </LegalArticle>
    </PageShell>
  );
}
