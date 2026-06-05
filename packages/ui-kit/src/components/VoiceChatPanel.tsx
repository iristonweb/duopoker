import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { SectionHeader } from './SectionHeader';

export function VoiceChatPanel({ children }: { children?: ReactNode }) {
  return (
    <GlassPanel interactive glow="emerald" className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <SectionHeader
          eyebrow="LiveKit"
          title="Voice at the table"
          description="Crystal-clear push-to-talk when your match is live."
          className="mb-0"
        />
        <span className="shrink-0 rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald">
          Beta
        </span>
      </div>
      <div
        className="mt-5 flex h-12 items-end gap-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 shadow-inner"
        aria-hidden
      >
        {[3, 6, 4, 9, 5, 8, 4, 7].map((h, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-emerald/30 to-emerald shadow-[0_0_8px_rgba(74,222,128,0.4)]"
            style={{ height: `${h * 10}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
      {children ? <div className="mt-5 border-t border-white/10 pt-5">{children}</div> : null}
    </GlassPanel>
  );
}
