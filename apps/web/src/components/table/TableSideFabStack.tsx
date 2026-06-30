import type { PropsWithChildren } from 'react';
import { cn } from '@duopoker/ui-kit';
import { tableFabBottomClass } from '../../hooks/useTableDockHeight';

type Props = PropsWithChildren<{
  className?: string;
}>;

/** Right-edge FAB anchor — history toolbar sits on the bottom tier of this stack. */
export function TableSideFabStack({ children, className }: Props) {
  return (
    <div
      className={cn(
        'pointer-events-auto absolute right-3 z-20 hidden flex-col items-end gap-2 max-table-compact:flex',
        'table-compact:fixed table-compact:right-3',
        tableFabBottomClass,
        className
      )}
    >
      {children}
    </div>
  );
}
