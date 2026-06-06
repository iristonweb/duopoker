import { Link } from 'react-router-dom';
import { brandLogoUrl, brandName } from '@duopoker/shared-types';
import { cn } from '@duopoker/ui-kit';

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
    size === 'sm'
      ? 'h-10 w-10 sm:h-11 sm:w-11'
      : size === 'lg'
        ? 'h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20'
        : 'h-12 w-12 sm:h-14 sm:w-14';

  const image = (
    <img
      src={brandLogoUrl}
      alt={brandName}
      className={cn(
        'shrink-0 object-contain drop-shadow-[0_2px_16px_rgba(232,197,71,0.4)]',
        sizeClass,
        className
      )}
      decoding="async"
      draggable={false}
      width={512}
      height={512}
    />
  );

  if (!link) return image;

  return (
    <Link
      to="/lobby"
      className="inline-flex shrink-0 items-center rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gold/50"
      aria-label={`${brandName} — на главную`}
    >
      {image}
    </Link>
  );
}
