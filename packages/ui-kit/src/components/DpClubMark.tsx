import { brandLogoUrl } from '@duopoker/shared-types';
import { cn } from '../cn';

/** Compact DP CLUB logo mark — same PNG as site header & favicon. */
export function DpClubMark({
  className,
  variant = 'gold',
  size = 'md'
}: {
  className?: string;
  /** Kept for API compatibility; logo is always the official DP CLUB PNG. */
  variant?: 'gold' | 'emerald' | 'mono';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  void variant;
  const dim =
    size === 'xs' ? 'h-5 w-5' : size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';

  return (
    <img
      src={brandLogoUrl}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      className={cn('shrink-0 object-contain drop-shadow-[0_2px_10px_rgba(232,197,71,0.35)]', dim, className)}
    />
  );
}
