import { cn } from '@duopoker/ui-kit';
import { colors } from '@duopoker/shared-types';

type Props = {
  secondsLeft: number;
  totalSeconds?: number;
  size?: number;
  className?: string;
};

export function TurnTimer({ secondsLeft, totalSeconds = 45, size = 44, className }: Props) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const strokeDashoffset = circumference * (1 - progress);
  const urgent = secondsLeft <= 10;

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={urgent ? colors.danger : colors.gold}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>
      <span
        className={cn(
          'absolute font-mono text-xs font-bold tabular-nums',
          urgent ? 'text-rose' : 'text-gold-light'
        )}
        aria-live="polite"
        aria-label={`${secondsLeft} seconds remaining`}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
