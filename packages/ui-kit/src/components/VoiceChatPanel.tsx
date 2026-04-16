import { GlassPanel } from './GlassPanel';

export function VoiceChatPanel() {
  return (
    <GlassPanel interactive>
      <div className="flex items-center justify-between gap-3">
        <div>
          <strong className="font-semibold text-zinc-100">Voice chat</strong>
          <p className="text-sm text-muted">Push-to-talk ready when in match</p>
        </div>
        <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2 py-0.5 text-xs font-medium text-emerald">
          Standby
        </span>
      </div>
      <div
        className="mt-4 flex h-10 items-end gap-1 rounded-lg border border-white/5 bg-black/30 px-2 py-1.5"
        aria-hidden
      >
        {[4, 7, 3, 9, 5, 8].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-sm bg-gradient-to-t from-emerald/40 to-emerald"
            style={{ height: `${h * 10}%` }}
          />
        ))}
      </div>
    </GlassPanel>
  );
}
