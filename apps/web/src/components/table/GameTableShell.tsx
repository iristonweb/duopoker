import type { ReactNode } from 'react';
import { AppBackground, cn } from '@duopoker/ui-kit';

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
  return (
    <div className={cn('relative h-dvh w-full overflow-hidden overscroll-none touch-pan-y', className)}>
      <AppBackground />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(232,197,71,0.06) 0%, transparent 55%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(5,5,8,0.65) 100%)'
        }}
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {hud}
        <div className="relative min-h-0 flex-1">{table}</div>
        {dock}
      </div>
      {overlay}
    </div>
  );
}
