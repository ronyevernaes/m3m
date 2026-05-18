interface GearIconProps {
  className?: string;
}

export function GearIcon({ className }: GearIconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.07 1.24a1 1 0 0 1 1.86 0l.28.76a5.1 5.1 0 0 1 1.19.69l.8-.17a1 1 0 0 1 1.06.63l.37.88a1 1 0 0 1-.38 1.18l-.67.47a5.15 5.15 0 0 1 0 1.64l.67.47a1 1 0 0 1 .38 1.18l-.37.88a1 1 0 0 1-1.06.63l-.8-.17a5.1 5.1 0 0 1-1.19.69l-.28.76a1 1 0 0 1-1.86 0l-.28-.76a5.1 5.1 0 0 1-1.19-.69l-.8.17a1 1 0 0 1-1.06-.63l-.37-.88a1 1 0 0 1 .38-1.18l.67-.47a5.15 5.15 0 0 1 0-1.64l-.67-.47a1 1 0 0 1-.38-1.18l.37-.88a1 1 0 0 1 1.06-.63l.8.17a5.1 5.1 0 0 1 1.19-.69l.28-.76ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="currentColor"
      />
    </svg>
  );
}
