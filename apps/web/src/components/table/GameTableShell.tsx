import { useRef, type ReactNode } from 'react';
import { AppBackground, cn } from '@duopoker/ui-kit';
import { useTableDockHeight } from '../../hooks/useTableDockHeight';

export function GameTableShell({
  hud,
  table,
  dock,
  overlay,
  className
}: {
  hud: ReactNode;
  table: ReactNode;
  dock?: ReactNode;
  overlay?: ReactNode;
  className?: string;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  useTableDockHeight(dockRef);

  return (
    <div
      data-testid="game-table-shell"
      className={cn('relative h-dvh w-full overflow-hidden overscroll-none touch-pan-y', className)}
      style={{ ['--table-dock-height' as string]: '7.5rem' }}
    >
      <AppBackground />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 75% 55% at 50% 38%, rgba(232,197,71,0.08) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(5,5,8,0.75) 100%)'
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '128px 128px'
        }}
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {hud}
        <div className="relative min-h-0 flex-1">{table}</div>
        {dock ? (
          <div ref={dockRef} data-table-dock className="shrink-0">
            {dock}
          </div>
        ) : null}
      </div>
      {overlay}
    </div>
  );
}
