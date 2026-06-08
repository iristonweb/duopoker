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

export function LegalOrganizer() {
  return (
    <PageShell
      maxWidth="2xl"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          ← Back to lobby
        </Link>
      }
    >
      <LegalArticle title="Organizer policy">
        <p>
          DuoPoker club subscriptions unlock organizer tools: member management, private table
          hosting, invites, and usage limits. Subscriptions do not purchase game outcomes, odds, or
          cash prizes.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>No rake, house cut, or pot fees in private tables.</li>
          <li>No in-app cashout, withdrawal, or peer-to-peer money transfers.</li>
          <li>Virtual chips are play-money only and have no real-world value.</li>
          <li>Organizers must moderate their clubs under our Community Rules.</li>
          <li>Plans may downgrade to read-only limits when billing lapses.</li>
        </ul>
        <p>
          Billing is processed by third-party providers (e.g. YooKassa). Refunds follow provider
          policies and applicable law in the Russian Federation. For support: [support@TBD].
        </p>
        <p className="text-xs text-subtle">
          See also{' '}
          <Link to="/legal/terms" className="premium-link">
            Terms of use
          </Link>{' '}
          and{' '}
          <Link to="/legal/community" className="premium-link">
            Community rules
          </Link>
          .
        </p>
      </LegalArticle>
    </PageShell>
  );
}
