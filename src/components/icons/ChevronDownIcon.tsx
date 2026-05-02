import { cn } from '../../lib/cn';

interface ChevronDownIconProps {
  className?: string;
}

export function ChevronDownIcon({ className }: ChevronDownIconProps) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0 transition-transform duration-150', className)}
      aria-hidden="true"
    >
      <path d="M1 3l4 4 4-4" />
    </svg>
  );
}
