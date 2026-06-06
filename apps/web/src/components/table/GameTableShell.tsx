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
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {hud}
        <div className="relative min-h-0 flex-1">{table}</div>
        {dock}
      </div>
      {overlay}
    </div>
  );
}
