import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, GlassPanel, PageShell, Textarea } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

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
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<string>();

  const requestDeletion = async () => {
    if (!accessToken) {
      setMsg('Sign in to request account deletion.');
      return;
    }
    const res = await apiFetch('/profile/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || undefined })
    });
    if (res.ok) {
      const data = (await res.json()) as { requestId?: string };
      setMsg(`Deletion request received (ref: ${data.requestId}). We will process within 30 days.`);
    } else {
      setMsg('Could not submit request. Contact [support@TBD].');
    }
  };

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
          We collect account identifiers (email), gameplay events required to run tables, and payment
          metadata processed by billing providers (Stripe, YooKassa). We use industry-standard
          security for transport and storage.
        </p>
        <p>Analytics and error reporting (e.g. Sentry) may be enabled when configured.</p>
        <LegalSection title="Retention">
          <ul className="list-disc space-y-2 pl-5">
            <li>Account profile: while your account is active + 30 days after deletion request</li>
            <li>Gameplay sessions: up to 12 months for reconnect and support</li>
            <li>Payment records: as required by billing providers and applicable law (typically 5 years)</li>
            <li>Compliance reports: up to 24 months</li>
          </ul>
        </LegalSection>
        <LegalSection title="Account deletion">
          <p>
            You may request deletion in-app below or email [support@TBD]. Payment records may be
            retained as required by law.
          </p>
          <Textarea
            className="mt-3"
            rows={3}
            placeholder="Optional reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void requestDeletion()}>
            Request account deletion
          </Button>
          {msg ? <p className="mt-2 text-xs">{msg}</p> : null}
        </LegalSection>
        <LegalSection title="Play-money product">
          <p>
            Private club fees purchase platform tools only — not odds, outcomes, or cash prizes. No
            cashout, rake, or peer-to-peer transfers in product.
          </p>
        </LegalSection>
      </LegalArticle>
    </PageShell>
  );
}
