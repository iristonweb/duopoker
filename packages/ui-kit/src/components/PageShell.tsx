import type { ReactNode } from 'react';
import { AppBackground } from './AppBackground';
import { SectionHeader } from './SectionHeader';
import { cn } from '../cn';

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl'
} as const;

export function PageShell({
  back,
  headerAction,
  eyebrow,
  title,
  description,
  maxWidth = '3xl',
  children,
  className,
  contentClassName
}: {
  back?: ReactNode;
  headerAction?: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  maxWidth?: keyof typeof maxWidthClass;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn('relative min-h-screen', className)}>
      <AppBackground />
      <div
        className={cn(
          'relative z-10 mx-auto px-4 py-10 sm:px-6 lg:py-12',
          maxWidthClass[maxWidth],
          contentClassName
        )}
      >
        {back || headerAction ? (
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="min-w-0">{back ?? null}</div>
            {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
          </div>
        ) : null}
        {title ? (
          <SectionHeader eyebrow={eyebrow} title={title} description={description} className="mb-8" />
        ) : null}
        {children}
      </div>
    </div>
  );
}
