export function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path
        d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4M6 5h12v4a6 6 0 0 1-12 0V5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 15v3M8 21h8M9 15h6" strokeLinecap="round" />
    </svg>
  );
}
