import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, GlassPanel, PageShell } from '@duopoker/ui-kit';
import { resolveApiUrl } from '../config/api';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [message, setMessage] = useState('Verifying your email…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    fetch(`${resolveApiUrl('/auth/verify-email')}?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; email?: string };
        if (!res.ok) {
          setStatus('error');
          setMessage(data.error ?? 'Verification failed.');
          return;
        }
        setStatus('ok');
        setMessage(`Email verified for ${data.email ?? 'your account'}. You can sign in now.`);
      })
      .catch(() => {
        setStatus('error');
        setMessage('Network error while verifying email.');
      });
  }, [token]);

  return (
    <PageShell
      maxWidth="lg"
      back={
        <Link to="/lobby" className="premium-link text-sm">
          ← Back to lobby
        </Link>
      }
      eyebrow="Account"
      title="Email verification"
    >
      <GlassPanel glow={status === 'ok' ? 'emerald' : status === 'error' ? 'none' : 'gold'} className="border-white/10 p-6">
        <Badge
          variant={status === 'ok' ? 'emerald' : status === 'error' ? 'rose' : 'gold'}
          className="mb-4"
        >
          {status === 'pending' ? 'Processing' : status === 'ok' ? 'Verified' : 'Failed'}
        </Badge>
        <p
          className={`text-sm leading-relaxed ${
            status === 'ok' ? 'text-emerald' : status === 'error' ? 'text-rose-300' : 'text-muted'
          }`}
        >
          {message}
        </p>
        {status === 'ok' ? (
          <Link to="/lobby" className="premium-link mt-5 inline-block text-sm">
            Continue to lobby →
          </Link>
        ) : null}
      </GlassPanel>
    </PageShell>
  );
}
