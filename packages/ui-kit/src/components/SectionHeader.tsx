import { cn } from '../cn';

export function SectionHeader({
  eyebrow,
  title,
  description,
  compact = false,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(compact ? 'mb-3' : 'mb-5', className)}>
      {eyebrow ? (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          'font-display font-semibold tracking-tight text-zinc-50',
          compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
        )}
      >
        {title}
      </h2>
      {description ? <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{description}</p> : null}
      {!compact ? (
        <div className="mt-3 h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" aria-hidden />
      ) : null}
    </div>
  );
}
