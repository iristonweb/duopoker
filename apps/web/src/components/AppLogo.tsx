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
    size === 'sm' ? 'h-9 w-9 sm:h-10 sm:w-10' : size === 'lg' ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-11 w-11 sm:h-12 sm:w-12';

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
