import { Link } from 'react-router-dom';
import { cn } from '@duopoker/ui-kit';

const LOGO_SRC = '/assets/logo/dp-club-logo.svg';

export function AppLogo({
  className,
  link = true,
  size = 'md'
}: {
  className?: string;
  link?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'h-9 sm:h-10' : size === 'lg' ? 'h-14 sm:h-16' : 'h-11 sm:h-12';

  const image = (
    <img
      src={LOGO_SRC}
      alt="DP CLUB"
      className={cn(
        'w-auto object-contain object-left drop-shadow-[0_2px_12px_rgba(232,197,71,0.35)]',
        sizeClass,
        className
      )}
      decoding="async"
      draggable={false}
    />
  );

  if (!link) return image;

  return (
    <Link
      to="/lobby"
      className="inline-flex shrink-0 items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gold/50"
      aria-label="DP CLUB — back to lobby"
    >
      {image}
    </Link>
  );
}
