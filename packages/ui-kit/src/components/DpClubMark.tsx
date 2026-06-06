import { cn } from '../cn';

/** Compact DP CLUB brand mark for premium UI surfaces. */
export function DpClubMark({
  className,
  variant = 'gold',
  size = 'md'
}: {
  className?: string;
  variant?: 'gold' | 'emerald' | 'mono';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const dim =
    size === 'xs' ? 'h-5 w-12' : size === 'sm' ? 'h-7 w-16' : size === 'lg' ? 'h-11 w-28' : 'h-9 w-20';
  const accent =
    variant === 'emerald' ? '#4ade80' : variant === 'mono' ? '#fafafa' : '#e8c547';
  const accentSoft =
    variant === 'emerald' ? '#86efac' : variant === 'mono' ? '#d4d4d8' : '#f5e6a8';

  return (
    <svg
      viewBox="0 0 120 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(dim, className)}
      aria-hidden
    >
      <rect x="1" y="1" width="118" height="46" rx="8" fill="#0c0c12" stroke={accent} strokeOpacity="0.45" strokeWidth="1.2" />
      <rect x="5" y="5" width="110" height="38" rx="6" stroke={accent} strokeOpacity="0.18" strokeWidth="0.8" />
      <text x="60" y="24" textAnchor="middle" fill={accentSoft} fontFamily="Georgia, serif" fontSize="16" fontWeight="700">
        DP
      </text>
      <text x="60" y="38" textAnchor="middle" fill={accent} fillOpacity="0.92" fontFamily="system-ui,sans-serif" fontSize="7" fontWeight="700" letterSpacing="0.32em">
        CLUB
      </text>
    </svg>
  );
}
