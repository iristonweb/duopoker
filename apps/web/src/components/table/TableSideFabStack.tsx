import type { PropsWithChildren } from 'react';
import { cn } from '@duopoker/ui-kit';
import { tableFabBottomClass } from '../../hooks/useTableDockHeight';

type LayoutVariant = 'desktop' | 'tablet' | 'classic';

type Props = PropsWithChildren<{
  className?: string;
  layoutVariant?: LayoutVariant;
}>;

/** Right-edge FAB anchor — history toolbar sits on the bottom tier of this stack. */
export function TableSideFabStack({ children, className, layoutVariant = 'desktop' }: Props) {
  const isClassic = layoutVariant === 'classic';

  return (
    <div
      className={cn(
        'pointer-events-auto absolute right-3 z-20 flex flex-col items-end gap-2',
        isClassic && 'hidden',
        !isClassic && 'table-compact:fixed table-compact:right-3',
        tableFabBottomClass,
        className
      )}
    >
      {children}
    </div>
  );
}
