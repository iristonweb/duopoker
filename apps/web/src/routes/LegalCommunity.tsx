import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, GlassPanel, Input, PageShell, Textarea } from '@duopoker/ui-kit';
import { useAppStore } from '../store/useAppStore';

function LegalArticle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassPanel className="border-white/10 p-6 sm:p-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ivory">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">{children}</div>
    </GlassPanel>
  );
}

export function LegalCommunity() {
  const apiFetch = useAppStore((s) => s.apiFetch);
  const accessToken = useAppStore((s) => s.accessToken);
  const [reason, setReason] = useState('');
  const [clubId, setClubId] = useState('');
  const [status, setStatus] = useState<string>();

  const submitReport = async () => {
    if (!accessToken) {
      setStatus('Sign in to submit a report.');
      return;
    }
    const res = await apiFetch('/compliance/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        clubId: clubId.trim() || undefined,
        type: 'user.report'
      })
    });
    if (res.ok) {
      const data = (await res.json()) as { reportId?: string };
      setStatus(`Report submitted (${data.reportId ?? 'ok'}).`);
      setReason('');
    } else {
      setStatus('Could not submit report.');
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
      <LegalArticle title="Community rules">
        <p>
          DuoPoker is a social play-money platform for users aged 18+ in supported jurisdictions.
          All participants must treat others with respect and use the product for entertainment only.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>No real-money betting, cashout requests, or peer-to-peer fund transfers.</li>
          <li>No harassment, hate speech, cheating, collusion, or bot abuse.</li>
          <li>No attempts to use club tools for gambling operations or payout handling.</li>
          <li>Organizers must enforce these rules in private clubs.</li>
        </ul>
        <p>
          Violations may result in account suspension, club removal, or permanent bans. We review
          high-risk reports within 72 hours.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="font-display text-lg font-semibold text-zinc-100">Report a violation</h2>
          <p className="mt-2 text-xs text-subtle">Optional club ID if the issue is club-specific.</p>
          <div className="mt-3 flex flex-col gap-3">
            <Input
              placeholder="Club ID (optional)"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
            />
            <Textarea
              placeholder="Describe what happened (min 5 characters)"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button variant="secondary" size="sm" className="self-start" onClick={() => void submitReport()}>
              Submit report
            </Button>
            {status ? <p className="text-xs text-muted">{status}</p> : null}
          </div>
        </div>
      </LegalArticle>
    </PageShell>
  );
}
