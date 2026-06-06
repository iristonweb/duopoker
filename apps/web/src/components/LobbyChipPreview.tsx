import { lobbyPreviewBanner } from '@duopoker/shared-types';

/** Premium lobby table preview — generated classic-card scene. */
export default function LobbyChipPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-black/40 shadow-glow-gold ring-1 ring-white/5">
      <img
        src={lobbyPreviewBanner}
        alt=""
        className="block aspect-video w-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/55 via-transparent to-gold/5" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

export function StaticChipPreview() {
  return <LobbyChipPreview />;
}
