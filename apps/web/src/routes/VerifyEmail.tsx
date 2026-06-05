import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppBackground, GlassPanel } from '@duopoker/ui-kit';
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
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-lg px-4 py-12">
        <Link to="/lobby" className="text-sm text-gold hover:underline">
          ← Back to lobby
        </Link>
        <GlassPanel className="mt-6 border-white/10 p-6">
          <h1 className="text-2xl font-semibold text-zinc-50">Email verification</h1>
          <p
            className={`mt-4 text-sm leading-relaxed ${
              status === 'ok' ? 'text-emerald-400' : status === 'error' ? 'text-rose-400' : 'text-muted'
            }`}
          >
            {message}
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
