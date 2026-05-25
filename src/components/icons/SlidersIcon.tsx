import { cn } from '../../lib/cn';

interface SlidersIconProps {
  className?: string;
}

export function SlidersIcon({ className }: SlidersIconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      aria-hidden="true"
    >
      <line x1="1" y1="3.5" x2="13" y2="3.5" />
      <circle cx="4" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
      <line x1="1" y1="10.5" x2="13" y2="10.5" />
      <circle cx="10" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
