import type { ReactNode } from 'react';
import { GlassPanel } from './GlassPanel';
import { cn } from '../cn';

export function EmptyState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <GlassPanel className={cn('border-white/10 p-8 text-center', className)}>
      <p className="font-display text-lg font-semibold text-ivory">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </GlassPanel>
  );
}
