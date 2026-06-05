import { Link } from 'react-router-dom';
import { AppBackground, GlassPanel } from '@duopoker/ui-kit';

export function LegalCommunity() {
  return (
    <div className="relative min-h-screen">
      <AppBackground />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12">
        <Link to="/lobby" className="text-sm text-gold hover:underline">
          ← Back to lobby
        </Link>
        <GlassPanel className="mt-6 border-white/10 p-6">
          <h1 className="text-2xl font-semibold text-zinc-50">Community rules</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            DuoPoker is a social play-money platform. All participants must treat others with respect
            and use the product for entertainment only.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>No real-money betting, cashout requests, or peer-to-peer fund transfers.</li>
            <li>No harassment, hate speech, cheating, collusion, or bot abuse.</li>
            <li>No attempts to use club tools for gambling operations or payout handling.</li>
            <li>Report suspicious behavior to your deployment administrator.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Violations may result in account suspension, club removal, or permanent bans. Organizers
            are responsible for moderating their private clubs within these rules.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
