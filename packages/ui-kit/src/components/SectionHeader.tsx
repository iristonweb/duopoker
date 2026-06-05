import { cn } from '../cn';

export function SectionHeader({
  eyebrow,
  title,
  description,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-5', className)}>
      {eyebrow ? (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-display text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">{title}</h2>
      {description ? <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{description}</p> : null}
      <div className="mt-3 h-px w-12 bg-gradient-to-r from-gold/60 to-transparent" aria-hidden />
    </div>
  );
}
